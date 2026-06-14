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

export default function LeadForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    facility_type: "",
    address: "",
    notes: "",
  });
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

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
            لتحديد موعد الزيارة والصيانة المجانية.
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

      <div className="row">
        <div className="field">
          <label>
            رقم الجوال <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="01xxxxxxxxx"
            required
          />
        </div>
        <div className="field">
          <label>
            رقم الواتساب <span className="hint">(للتواصل وتحديد الموعد)</span>
          </label>
          <input
            type="tel"
            inputMode="tel"
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
            placeholder="01xxxxxxxxx"
          />
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
        {loading ? "جاري الإرسال..." : "تأكيد طلب الزيارة المجانية"}
      </button>
    </form>
  );
}
