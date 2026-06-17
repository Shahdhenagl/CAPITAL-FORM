// Bevatel WhatsApp client (Developer API).
// Sends approved WhatsApp template messages via Bevatel's single-call endpoint:
//   POST {BASE}/developer/api/v1/messages
// This is the same endpoint Bevatel support verified delivers to the customer.
// NOTE: the older Chatwoot conversation API (/api/v1/accounts/.../messages) only
// stored the message in the inbox and never triggered WhatsApp delivery.

// Approved templates (must match the names registered in Bevatel/Meta exactly).
export const TEMPLATES = {
  confirm: { name: "appointment_confirm", language: "ar" },
  reminder: { name: "appointment_reminder", language: "ar" },
  welcome: { name: "lead_welcome", language: "ar" },
  followup: { name: "visit_followup", language: "ar" },
};

function config() {
  const baseUrl = (process.env.BEVATEL_BASE_URL || "https://chat.bevatel.com").replace(/\/+$/, "");
  const accountId = process.env.BEVATEL_ACCOUNT_ID;
  const inboxId = process.env.BEVATEL_INBOX_ID;
  const token = process.env.BEVATEL_API_TOKEN;
  if (!accountId || !inboxId || !token) {
    throw new Error(
      "Bevatel env vars missing. Set BEVATEL_ACCOUNT_ID, BEVATEL_INBOX_ID, BEVATEL_API_TOKEN."
    );
  }
  return { baseUrl, accountId, inboxId, token };
}

// Normalizes a phone number to E.164 (with leading +) expected by the API.
export function toE164(raw) {
  if (!raw) return "";
  let n = String(raw).replace(/[^\d+]/g, "");
  n = n.replace(/^\+/, "");
  if (n.startsWith("00")) n = n.slice(2);
  // Egyptian local format: 01xxxxxxxxx -> 201xxxxxxxxx
  if (n.startsWith("0")) n = "20" + n.slice(1);
  return "+" + n;
}

// Calls the Bevatel Developer API and surfaces any failure (including a
// stored-but-not-delivered message) instead of swallowing it silently.
async function devApi(cfg, path, options = {}) {
  const res = await fetch(`${cfg.baseUrl}/developer/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      api_account_id: cfg.accountId,
      api_access_token: cfg.token,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = new Error(`Bevatel ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

// Sends an approved WhatsApp template message in a single call.
// kind: "confirm" | "reminder" | "welcome" | "followup"
// params: ordered array of body variable values, mapped to {{1}}, {{2}}, ...
// (content is no longer used by the Developer API and is ignored.)
export async function sendTemplate({ to, name, kind, params }) {
  const template = TEMPLATES[kind];
  if (!template) throw new Error(`Unknown template kind: ${kind}`);

  const phone = toE164(to);
  if (!phone || phone.length < 8) throw new Error("رقم واتساب غير صالح");

  const cfg = config();

  const body = (params || []).map((v) => (v == null ? "" : String(v)));

  const payload = {
    inbox_id: Number(cfg.inboxId),
    contact: { phone_number: phone },
    message: {
      template: {
        name: template.name,
        language: template.language,
        parameters: { body },
      },
    },
  };

  const result = await devApi(cfg, `/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // Some Bevatel responses still mark a message as failed at the WhatsApp layer
  // (bad template/number/window) even with a 2xx status. Surface that.
  const status = result?.data?.status || result?.status;
  const extError =
    result?.data?.content_attributes?.external_error ||
    result?.error ||
    result?.message;
  if (status === "failed" || (extError && status !== "sent" && status !== "delivered")) {
    if (extError) {
      const err = new Error(`Bevatel delivery failed: ${extError}`);
      err.body = result;
      throw err;
    }
  }

  return { ok: true, result };
}
