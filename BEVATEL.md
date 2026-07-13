# دليل ربط Bevatel WhatsApp — جاهز للنسخ في أي مشروع

> انسخ هذا الملف + ملف `lib/bevatel.js` لأي مشروع جديد، اضبط 4 متغيرات بيئية، وابدأ الإرسال فورًا.

---

## 1. المتغيرات البيئية (Environment Variables)

ضِفهم في `.env` (والـ `.env.example` للتوثيق):

```env
# Bevatel WhatsApp (Developer API)
BEVATEL_BASE_URL=https://chat.bevatel.com
BEVATEL_ACCOUNT_ID=40728
BEVATEL_INBOX_ID=107608
BEVATEL_API_TOKEN=your-bevatel-auth-token
```

| المتغير | إيه هو | منين تجيبه |
|---|---|---|
| `BEVATEL_BASE_URL` | عنوان السيرفر | دايمًا `https://chat.bevatel.com` |
| `BEVATEL_ACCOUNT_ID` | رقم الحساب | من لوحة Bevatel / الدعم |
| `BEVATEL_INBOX_ID` | رقم الـ inbox بتاع الواتساب | من لوحة Bevatel |
| `BEVATEL_API_TOKEN` | توكن الـ API | من إعدادات الـ Developer API |

---

## 2. نقطة مهمة جدًا (الدرس اللي اتعلمناه)

الـ endpoint الصح هو **الـ Developer API**:

```
POST {BASE}/developer/api/v1/messages
```

**مش** الـ Chatwoot conversation API القديم (`/api/v1/accounts/.../messages`) — ده بيخزّن
الرسالة في الـ inbox بس وعمره ما بيبعت واتساب فعلي.

الـ Headers للمصادقة:

- `api_account_id: <ACCOUNT_ID>`
- `api_access_token: <TOKEN>`

---

## 3. القوالب (Templates)

الإرسال بيتم عن طريق **قوالب معتمدة فقط** (approved templates). لازم تسجّلهم في Bevatel/Meta
وتتطابق الأسماء حرف بحرف مع اللي في الكود:

```js
export const TEMPLATES = {
  confirm:  { name: "appointment_confirm",  language: "ar" },
  reminder: { name: "appointment_reminder", language: "ar" },
  welcome:  { name: "lead_welcome",         language: "ar" },
  followup: { name: "visit_followup",       language: "ar" },
};
```

قيم `params` بتتحط مكان `{{1}}`, `{{2}}`... في جسم القالب بالترتيب.

---

## 4. الـ Client الجاهز — `lib/bevatel.js`

```js
// Bevatel WhatsApp client (Developer API).
// POST {BASE}/developer/api/v1/messages

export const TEMPLATES = {
  confirm:  { name: "appointment_confirm",  language: "ar" },
  reminder: { name: "appointment_reminder", language: "ar" },
  welcome:  { name: "lead_welcome",         language: "ar" },
  followup: { name: "visit_followup",       language: "ar" },
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

// يحوّل الرقم لصيغة E.164 (+20...). يدعم الصيغة المصرية 01xxxxxxxxx
export function toE164(raw) {
  if (!raw) return "";
  let n = String(raw).replace(/[^\d+]/g, "");
  n = n.replace(/^\+/, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "20" + n.slice(1); // 01xxxx -> 201xxxx
  return "+" + n;
}

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
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) {
    const err = new Error(`Bevatel ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

// يبعت قالب واتساب معتمد في نداء واحد.
// kind: "confirm" | "reminder" | "welcome" | "followup"
// params: مصفوفة قيم بالترتيب -> {{1}}, {{2}}, ...
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

  // النجاح بيرجّع 201 مع {"message":"Message created successfully"}
  const result = await devApi(cfg, `/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // نتعامل مع حالة الفشل الصريحة فقط (نجاح الـ body مش خطأ)
  const status = result?.data?.status || result?.status;
  if (status === "failed") {
    const extError = result?.data?.content_attributes?.external_error || "unknown error";
    const err = new Error(`Bevatel delivery failed: ${extError}`);
    err.body = result;
    throw err;
  }

  return { ok: true, result };
}
```

---

## 5. شكل الـ Payload اللي بيتبعت

```json
{
  "inbox_id": 107608,
  "contact": { "phone_number": "+201234567890" },
  "message": {
    "template": {
      "name": "lead_welcome",
      "language": "ar",
      "parameters": { "body": ["أحمد"] }
    }
  }
}
```

---

## 6. طريقة الاستخدام في أي مكان

```js
import { sendTemplate } from "@/lib/bevatel";

// الإرسال دايمًا داخل try/catch عشان فشل الواتساب ما يوقفش باقي العملية
try {
  await sendTemplate({
    to: data.whatsapp || data.phone, // أي صيغة رقم
    kind: "welcome",                 // اسم القالب
    params: [data.name],             // {{1}} = الاسم
  });
} catch (err) {
  console.error("Bevatel send failed:", err);
}
```

---

## 7. تشيك ليست سريعة لأي مشروع جديد

1. انسخ `lib/bevatel.js`.
2. حط الـ 4 متغيرات في `.env`.
3. اتأكد إن القوالب اللي هتستخدمها **متسجلة ومعتمدة** في Bevatel بنفس الأسماء واللغة.
4. ظبّط `params` حسب عدد المتغيرات `{{n}}` في كل قالب.
5. نادِ `sendTemplate` جوه `try/catch`.
6. لو رقم غير مصري عدّل دالة `toE164`.

---

## 8. ملاحظات استكشاف الأخطاء (Troubleshooting)

- **الرسالة اتخزنت بس ماوصلتش؟** غالبًا بتستخدم الـ endpoint القديم. اتأكد إنه `/developer/api/v1/messages`.
- **401 / 403؟** راجع `api_account_id` و `api_access_token` في الـ headers.
- **قالب مرفوض / template not found؟** الاسم أو اللغة مش مطابقين للمسجّل في Bevatel.
- **عدد المتغيرات غلط؟** عدد عناصر `params` لازم يساوي عدد `{{n}}` في القالب.
