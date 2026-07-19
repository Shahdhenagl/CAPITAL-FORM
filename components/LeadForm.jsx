"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="map-box" style={{ display: "grid", placeItems: "center" }}>
      جاري تحميل الخريطة...
    </div>
  ),
});

const COUNTRIES = [
  { code: "+966", name: "🇸🇦 السعودية", ph: "5XXXXXXXX" },
  { code: "+20", name: "🇪🇬 مصر", ph: "10XXXXXXXX" },
];

// Combines a country dial code with a local number (drops leading zeros).
function fullNumber(code, local) {
  let n = String(local || "").replace(/\D/g, "").replace(/^0+/, "");
  const codeNum = code.replace(/\D/g, "");
  if (n.startsWith(codeNum)) {
    n = n.slice(codeNum.length);
  }
  return n ? `${code}${n}` : "";
}

export default function LeadForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    facility_type: "",
    address: "",
    notes: "",
  });
  const [country, setCountry] = useState(COUNTRIES[0].code);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const activeCountry =
    COUNTRIES.find((c) => c.code === country) || COUNTRIES[0];

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.phone.trim()) {
      setError("من فضلك أدخل الاسم ورقم الجوال.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: fullNumber(country, form.phone),
          whatsapp: fullNumber(country, form.whatsapp),
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حدث خطأ، حاول مرة أخرى.");
      } else {
        setDone(true);
      }
    } catch {
      setError("تعذر الاتصال بالخادم، تأكد من الإنترنت وحاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card">
        <div className="success">
          <div className="check">✓</div>
          <h2>تم استلام طلبك بنجاح!</h2>
          <p style={{ color: "var(--muted)" }}>
            شكراً لتواصلك مع <b>عاصمة الكون للمصاعد</b>. سيتواصل معك فريقنا قريباً
            لتحديد موعد زيارة المعاينة المجانية، مع خصم يصل إلى 50% على عقود
            الصيانة والتركيب.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      {error && <div className="alert">{error}</div>}

      <div className="field">
        <label>
          الاسم بالكامل <span style={{ color: "var(--danger)" }}>*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="مثال: أحمد محمد"
          required
        />
      </div>

      <div className="field">
        <label>الدولة</label>
        <select value={country} onChange={(e) => setCountry(e.target.value)}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      <div className="row">
        <div className="field">
          <label>
            رقم الجوال <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <div className="tel">
            <span className="tel-code">{country}</span>
            <input
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder={activeCountry.ph}
              required
            />
          </div>
        </div>
        <div className="field">
          <label>
            رقم الواتساب <span className="hint">(للتواصل وتحديد الموعد)</span>
          </label>
          <div className="tel">
            <span className="tel-code">{country}</span>
            <input
              type="tel"
              inputMode="tel"
              value={form.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              placeholder={activeCountry.ph}
            />
          </div>
        </div>
      </div>

      <div className="field">
        <label>نوع المنشأة</label>
        <select
          value={form.facility_type}
          onChange={(e) => update("facility_type", e.target.value)}
        >
          <option value="">اختر نوع المنشأة...</option>
          <option value="hotel">فندق</option>
          <option value="company">شركة</option>
          <option value="building">عمارة سكنية</option>
          <option value="other">أخرى</option>
        </select>
      </div>

      <div className="field">
        <label>العنوان بالتفصيل</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          placeholder="المدينة - الحي - الشارع - رقم العقار"
        />
      </div>

      <div className="field">
        <label>
          حدّد موقعك على الخريطة{" "}
          <span className="hint">(يساعد فريقنا في الوصول بسرعة)</span>
        </label>
        <LocationPicker value={location} onChange={setLocation} />
      </div>

      <div className="field">
        <label>ملاحظات إضافية</label>
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="مثال: عدد المصاعد، الدور، نوع العطل إن وجد..."
        />
      </div>

      <button className="btn full" type="submit" disabled={loading}>
        {loading ? "جاري الإرسال..." : "تأكيد طلب المعاينة المجانية"}
      </button>
    </form>
  );
}
