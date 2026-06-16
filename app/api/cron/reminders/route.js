import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sendTemplate } from "@/lib/bevatel";

export const runtime = "nodejs";
// Always run dynamically (never cached) — this is a scheduled job.
export const dynamic = "force-dynamic";

const KSA_OFFSET_MS = 3 * 60 * 60 * 1000; // Saudi Arabia is UTC+3 (no DST).

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Riyadh",
    });
  } catch {
    return iso;
  }
}

// Returns the UTC ISO bounds for "tomorrow" in Saudi local time.
function tomorrowBoundsUtc() {
  const ksaNow = new Date(Date.now() + KSA_OFFSET_MS);
  const y = ksaNow.getUTCFullYear();
  const m = ksaNow.getUTCMonth();
  const d = ksaNow.getUTCDate() + 1; // tomorrow
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - KSA_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - KSA_OFFSET_MS);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function GET(req) {
  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
  }

  const { start, end } = tomorrowBoundsUtc();

  let leads;
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "scheduled")
      .is("reminder_sent_at", null)
      .gte("appointment_at", start)
      .lte("appointment_at", end);
    if (error) {
      console.error("Cron query error:", error);
      return NextResponse.json({ error: "تعذر قراءة المواعيد" }, { status: 500 });
    }
    leads = data || [];
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }

  const results = { total: leads.length, sent: 0, failed: 0, skipped: 0 };

  for (const lead of leads) {
    const to = lead.whatsapp || lead.phone;
    if (!to) {
      results.skipped++;
      continue;
    }
    const dateStr = fmtDate(lead.appointment_at);
    try {
      await sendTemplate({
        to,
        name: lead.name,
        kind: "reminder",
        params: [lead.name, dateStr],
        content: `تذكير من عاصمة الكون للمصاعد ⏰\nمرحباً ${lead.name}، نذكّرك بموعد زيارة الصيانة المجانية يوم ${dateStr}.\nفي انتظارك، وبرجاء إبلاغنا فوراً لو رغبت في تغيير الموعد.`,
      });
      results.sent++;
      // Mark as reminded (best-effort) so we don't send again.
      const supabase = getSupabase();
      await supabase
        .from("leads")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", lead.id);
    } catch (err) {
      console.error(`Reminder failed for lead ${lead.id}:`, err);
      results.failed++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
