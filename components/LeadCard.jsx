"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { waLink } from "@/lib/whatsapp";

const FACILITY = {
  hotel: "فندق",
  company: "شركة",
  building: "عمارة سكنية",
  other: "أخرى",
};

const STATUS = {
  new: "جديد",
  scheduled: "تم تحديد موعد",
  done: "تمت الزيارة",
};

function fmtDate(s) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return s;
  }
}

export default function LeadCard({ lead }) {
  const router = useRouter();
  const [appointment, setAppointment] = useState(
    lead.appointment_at ? toLocalInput(lead.appointment_at) : ""
  );
  const [teamNote, setTeamNote] = useState(lead.team_note || "");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState("");
  const noteChanged = (teamNote || "") !== (lead.team_note || "");

  async function sendTemplate(kind) {
    setSending(kind);
    try {
      const res = await fetch(`/api/leads/${lead.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(kind === "confirm" ? "تم إرسال تأكيد الموعد ✅" : "تم إرسال التذكير ⏰");
      } else {
        alert(data.error || "تعذر إرسال الرسالة");
      }
    } catch {
      alert("تعذر الاتصال بالخادم");
    } finally {
      setSending("");
    }
  }

  async function patch(update) {
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (res.ok) router.refresh();
      else alert("تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("حذف هذا الطلب نهائياً؟")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else alert("تعذر الحذف");
    } finally {
      setBusy(false);
    }
  }

  function saveAppointment() {
    const iso = appointment ? new Date(appointment).toISOString() : null;
    patch({ appointment_at: iso, status: iso ? "scheduled" : lead.status });
  }

  function saveTeamNote() {
    if (!noteChanged) return;
    patch({ team_note: teamNote });
  }

  const waNumber = lead.whatsapp || lead.phone;
  const apptText = appointment
    ? `مرحباً ${lead.name}، معك فريق عاصمة الكون للمصاعد. تم تحديد موعد زيارة المعاينة المجانية يوم ${fmtDate(
        new Date(appointment).toISOString()
      )}، سجل و تابع عاصمة الكون و ارتقي بمصعدك. برجاء التأكيد. شكراً لك.`
    : `مرحباً ${lead.name}، معك فريق عاصمة الكون للمصاعد بخصوص طلب زيارة المعاينة المجانية.`;

  return (
    <div className="lead">
      <div className="lead-top">
        <div>
          <div className="lead-name">{lead.name}</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {fmtDate(lead.created_at)}
          </div>
        </div>
        <span className={`chip ${lead.status}`}>
          {STATUS[lead.status] || lead.status}
        </span>
      </div>

      <div className="lead-meta">
        {lead.employee_name && (
          <div>
            <b>موظف التسويق: </b>
            {lead.employee_name}
          </div>
        )}
        <div>
          <b>الجوال: </b>
          <a href={`tel:${lead.phone}`}>{lead.phone}</a>
        </div>
        {lead.whatsapp && (
          <div>
            <b>واتساب: </b>
            {lead.whatsapp}
          </div>
        )}
        <div>
          <b>نوع المنشأة: </b>
          {FACILITY[lead.facility_type] || lead.facility_type || "-"}
        </div>
        {lead.address && (
          <div>
            <b>العنوان: </b>
            {lead.address}
          </div>
        )}
        {lead.maps_link && (
          <div>
            <b>الموقع: </b>
            <a href={lead.maps_link} target="_blank" rel="noreferrer">
              فتح على خرائط جوجل
            </a>
          </div>
        )}
        {lead.appointment_at && (
          <div>
            <b>الموعد: </b>
            {fmtDate(lead.appointment_at)}
          </div>
        )}
        {lead.notes && (
          <div style={{ gridColumn: "1 / -1" }}>
            <b>تفاصيل الطلب: </b>
            {lead.notes}
          </div>
        )}
      </div>

      <div className="team-note">
        <label>📝 ملاحظة الفريق</label>
        <textarea
          rows={2}
          placeholder="اكتب ملاحظة داخلية للفريق عن هذا الطلب..."
          value={teamNote}
          onChange={(e) => setTeamNote(e.target.value)}
          onBlur={saveTeamNote}
        />
        <button
          className="btn sm"
          onClick={saveTeamNote}
          disabled={busy || !noteChanged}
        >
          {noteChanged ? "حفظ الملاحظة" : "محفوظة"}
        </button>
      </div>

      <div className="lead-actions">
        <input
          type="datetime-local"
          value={appointment}
          onChange={(e) => setAppointment(e.target.value)}
        />
        <button className="btn sm" onClick={saveAppointment} disabled={busy}>
          حفظ الموعد
        </button>
        <button
          className="btn green sm"
          onClick={() => sendTemplate("confirm")}
          disabled={busy || !!sending || !lead.appointment_at}
          title={!lead.appointment_at ? "احفظ الموعد أولاً" : "إرسال تأكيد الموعد عبر بيفاتيل"}
        >
          {sending === "confirm" ? "جارٍ الإرسال..." : "تأكيد الموعد ✅"}
        </button>
        <button
          className="btn sm"
          onClick={() => sendTemplate("reminder")}
          disabled={busy || !!sending || !lead.appointment_at}
          title={!lead.appointment_at ? "احفظ الموعد أولاً" : "إرسال تذكير عبر بيفاتيل"}
        >
          {sending === "reminder" ? "جارٍ الإرسال..." : "تذكير ⏰"}
        </button>
        <a
          className="btn ghost sm"
          href={waLink(waNumber, apptText)}
          target="_blank"
          rel="noreferrer"
        >
          واتساب يدوي
        </a>
        {lead.status !== "done" && (
          <button
            className="btn ghost sm"
            onClick={() => patch({ status: "done" })}
            disabled={busy}
          >
            تمت الزيارة
          </button>
        )}
        <button
          className="btn sm"
          onClick={() => sendTemplate("followup")}
          disabled={busy || !!sending}
          title="إرسال رسالة شكر بعد الزيارة"
        >
          {sending === "followup" ? "جارٍ الإرسال..." : "شكر بعد الزيارة 🙏"}
        </button>
        <button
          className="btn ghost sm"
          style={{ color: "var(--danger)", marginInlineStart: "auto" }}
          onClick={remove}
          disabled={busy}
        >
          حذف
        </button>
      </div>
    </div>
  );
}

// Converts an ISO string to a value usable by <input type="datetime-local">.
function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
