"use client";

import { useMemo, useState } from "react";
import LeadCard from "@/components/LeadCard";

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

// Builds a "YYYY-MM" key from an ISO date string.
function monthKey(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTHS_AR[Number(m) - 1]} ${y}`;
}

export default function LeadsDashboard({ leads }) {
  const [status, setStatus] = useState("all");
  const [month, setMonth] = useState("all");

  // Distinct months present in the data, newest first.
  const months = useMemo(() => {
    const set = new Set();
    for (const l of leads) {
      const k = monthKey(l.created_at);
      if (k) set.add(k);
    }
    return Array.from(set).sort().reverse();
  }, [leads]);

  // Apply month filter first, then status — counts on the cards reflect the
  // selected month so the totals always match what's shown below.
  const byMonth = useMemo(
    () =>
      month === "all"
        ? leads
        : leads.filter((l) => monthKey(l.created_at) === month),
    [leads, month]
  );

  const counts = useMemo(
    () => ({
      all: byMonth.length,
      new: byMonth.filter((l) => l.status === "new").length,
      contacted: byMonth.filter((l) => l.status === "contacted").length,
      scheduled: byMonth.filter((l) => l.status === "scheduled").length,
      done: byMonth.filter((l) => l.status === "done").length,
    }),
    [byMonth]
  );

  const filtered = useMemo(
    () => (status === "all" ? byMonth : byMonth.filter((l) => l.status === status)),
    [byMonth, status]
  );

  const cards = [
    { key: "all", label: "إجمالي الطلبات", n: counts.all },
    { key: "new", label: "طلبات جديدة", n: counts.new },
    { key: "contacted", label: "تم التواصل", n: counts.contacted },
    { key: "scheduled", label: "مواعيد محددة", n: counts.scheduled },
    { key: "done", label: "زيارات تمت", n: counts.done },
  ];

  return (
    <>
      <div className="stats">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`stat stat-btn ${status === c.key ? "active" : ""}`}
            onClick={() => setStatus(c.key)}
          >
            <div className="n">{c.n}</div>
            <div className="l">{c.label}</div>
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <label htmlFor="month">تصفية بالشهر:</label>
        <select
          id="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="all">كل الشهور</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        {(status !== "all" || month !== "all") && (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              setStatus("all");
              setMonth("all");
            }}
          >
            إلغاء الفلترة
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">لا توجد طلبات مطابقة لهذه الفلترة.</div>
      ) : (
        filtered.map((lead) => <LeadCard key={lead.id} lead={lead} />)
      )}
    </>
  );
}
