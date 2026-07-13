"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

const NEW_EMPLOYEE = "__new__";

// Combines a country dial code with a local number (drops leading zeros).
function fullNumber(code, local) {
  const n = String(local || "").replace(/\D/g, "").replace(/^0+/, "");
  return n ? `${code}${n}` : "";
}

export default function ManualLeadForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [employee, setEmployee] = useState(""); // selected name, or NEW_EMPLOYEE
  const [newEmployee, setNewEmployee] = useState("");

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

  // Load the saved marketing-employee names for the drop-down.
  async function loadEmployees() {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch {
      /* non-fatal — the field still accepts a new name */
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // The employee name to attach: either the picked one or the typed new one.
  function resolvedEmployee() {
    return employee === NEW_EMPLOYEE ? newEmployee.trim() : employee.trim();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const empName = resolvedEmployee();
    if (!empName) {
      setError("من فضلك اختر اسم موظف التسويق أو أضف اسماً جديداً.");
      return;
    }
    if (!form.name.trim() || !form.phone.trim()) {
      setError("من فضلك أدخل اسم العميل ورقم الجوال.");
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
          employee_name: empName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حدث خطأ، حاول مرة أخرى.");
      } else {
        setDone(true);
        // Reset client fields but keep the selected employee for the next entry.
        setForm({
          name: "",
          phone: "",
          whatsapp: "",
          facility_type: "",
          address: "",
          notes: "",
        });
        setLocation(null);
        if (employee === NEW_EMPLOYEE) {
          setEmployee(empName);
          setNewEmployee("");
        }
        await loadEmployees();
        router.refresh(); // show the new lead in the list below
        setTimeout(() => setDone(false), 4000);
      }
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="manual-lead">
      <button
        type="button"
        className="btn"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "▲ إغلاق نموذج الإضافة" : "➕ إضافة طلب جديد (موظف تسويق)"}
      </button>

      {open && (
        <form className="card manual-card" onSubmit={handleSubmit}>
          {error && <div className="alert">{error}</div>}
          {done && (
            <div className="alert" style={{ background: "#0a7", color: "#fff" }}>
              ✓ تم حفظ الطلب باسم الموظف بنجاح.
            </div>
          )}

          <div className="field">
            <label>
              موظف التسويق (اسمك){" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <select
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
            >
              <option value="">اختر اسم الموظف...</option>
              {employees.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value={NEW_EMPLOYEE}>➕ إضافة موظف جديد...</option>
            </select>
          </div>

          {employee === NEW_EMPLOYEE && (
            <div className="field">
              <label>
                اسم الموظف الجديد{" "}
                <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                value={newEmployee}
                onChange={(e) => setNewEmployee(e.target.value)}
                placeholder="مثال: محمد التسويق"
              />
            </div>
          )}

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "6px 0" }} />

          <div className="field">
            <label>
              اسم العميل <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="مثال: أحمد محمد"
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
                />
              </div>
            </div>
            <div className="field">
              <label>رقم الواتساب</label>
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
              تحديد الموقع على الخريطة{" "}
              <span className="hint">(اختياري)</span>
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
            {loading ? "جاري الحفظ..." : "حفظ الطلب باسم الموظف"}
          </button>
        </form>
      )}
    </div>
  );
}
