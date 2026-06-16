// Bevatel (Chatwoot-based) WhatsApp client.
// Sends approved WhatsApp template messages from the connected Bevatel inbox.
// Flow: ensure contact -> ensure conversation -> send template message.

// Approved templates (must match the names registered in Bevatel/Meta exactly).
export const TEMPLATES = {
  confirm: { name: "appointment_confirm", language: "ar", category: "utility" },
  reminder: { name: "appointment_reminder", language: "ar", category: "utility" },
  welcome: { name: "lead_welcome", language: "ar", category: "utility" },
  followup: { name: "visit_followup", language: "ar", category: "marketing" },
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

// Normalizes a phone number to E.164 (with leading +) for the Chatwoot contact API.
export function toE164(raw) {
  if (!raw) return "";
  let n = String(raw).replace(/[^\d+]/g, "");
  n = n.replace(/^\+/, "");
  if (n.startsWith("00")) n = n.slice(2);
  return "+" + n;
}

async function api(cfg, path, options = {}) {
  const res = await fetch(`${cfg.baseUrl}/api/v1/accounts/${cfg.accountId}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

// Finds a contact by phone or creates one, then returns { contactId, sourceId }
// where sourceId is the contact_inbox source for our WhatsApp inbox.
async function ensureContact(cfg, phone, name) {
  const inboxId = Number(cfg.inboxId);

  // 1) Try to find an existing contact by phone.
  let contactId = null;
  try {
    const search = await api(
      cfg,
      `/contacts/search?q=${encodeURIComponent(phone)}`
    );
    const match = (search?.payload || []).find(
      (c) => toE164(c.phone_number) === phone
    );
    if (match) contactId = match.id;
  } catch {
    // Search failure shouldn't block creation.
  }

  // 2) Create the contact if not found.
  if (!contactId) {
    const created = await api(cfg, `/contacts`, {
      method: "POST",
      body: JSON.stringify({ inbox_id: inboxId, name, phone_number: phone }),
    });
    const contact = created?.payload?.contact || created?.payload;
    contactId = contact?.id;
    const srcFromCreate = (contact?.contact_inboxes || []).find(
      (ci) => ci?.inbox?.id === inboxId
    )?.source_id;
    if (srcFromCreate) return { contactId, sourceId: srcFromCreate };
  }

  if (!contactId) throw new Error("Bevatel: could not resolve contact id.");

  // 3) Resolve (or create) the contact_inbox source_id for our inbox.
  const detail = await api(cfg, `/contacts/${contactId}`);
  const inboxes = detail?.payload?.contact_inboxes || [];
  let sourceId = inboxes.find((ci) => ci?.inbox?.id === inboxId)?.source_id;

  if (!sourceId) {
    const ci = await api(cfg, `/contacts/${contactId}/contact_inboxes`, {
      method: "POST",
      body: JSON.stringify({ inbox_id: inboxId }),
    });
    sourceId = ci?.source_id || ci?.payload?.source_id;
  }

  if (!sourceId) throw new Error("Bevatel: could not resolve contact inbox source.");
  return { contactId, sourceId };
}

// Reuses an existing conversation for the contact or creates a new one.
async function ensureConversation(cfg, contactId, sourceId) {
  const inboxId = Number(cfg.inboxId);
  try {
    const list = await api(cfg, `/contacts/${contactId}/conversations`);
    const convs = list?.payload || [];
    const existing = convs.find((c) => c?.inbox_id === inboxId) || convs[0];
    if (existing?.id) return existing.id;
  } catch {
    // Fall through to creation.
  }

  const created = await api(cfg, `/conversations`, {
    method: "POST",
    body: JSON.stringify({
      source_id: sourceId,
      inbox_id: inboxId,
      contact_id: contactId,
    }),
  });
  const id = created?.id || created?.payload?.id;
  if (!id) throw new Error("Bevatel: could not create conversation.");
  return id;
}

// Sends an approved WhatsApp template message.
// kind: "confirm" | "reminder"
// params: ordered array of body variable values, mapped to {{1}}, {{2}}, ...
// content: human-readable rendered text (shown in the inbox timeline).
export async function sendTemplate({ to, name, kind, params, content }) {
  const template = TEMPLATES[kind];
  if (!template) throw new Error(`Unknown template kind: ${kind}`);

  const phone = toE164(to);
  if (!phone || phone.length < 8) throw new Error("رقم واتساب غير صالح");

  const cfg = config();
  const { contactId, sourceId } = await ensureContact(cfg, phone, name || phone);
  const conversationId = await ensureConversation(cfg, contactId, sourceId);

  const processed_params = {};
  (params || []).forEach((v, i) => {
    processed_params[String(i + 1)] = v == null ? "" : String(v);
  });

  await api(cfg, `/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: content || "",
      template_params: {
        name: template.name,
        language: template.language,
        category: template.category,
        processed_params,
      },
    }),
  });

  return { ok: true, conversationId };
}
