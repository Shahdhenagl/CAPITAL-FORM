import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { sessionToken } from "@/lib/auth";
import { sendTemplate } from "@/lib/bevatel";

export const runtime = "nodejs";

function authorized() {
  const c = cookies().get("cf_session")?.value;
  return c && c === sessionToken();
}

const VALID_KIND = ["confirm", "reminder", "welcome", "followup"];
// Kinds that include the appointment date variable.
const NEEDS_APPOINTMENT = ["confirm", "reminder"];

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export async function POST(req, { params }) {
  if (!authorized()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "صيغة غير صحيحة" }, { status: 400 });
  }

  const kind = body.kind;
  if (!VALID_KIND.includes(kind)) {
    return NextResponse.json({ error: "نوع رسالة غير صحيح" }, { status: 400 });
  }

  let lead;
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", params.id)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }
    lead = data;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }

  const to = lead.whatsapp || lead.phone;
  if (!to) {
    return NextResponse.json({ error: "لا يوجد رقم واتساب لهذا العميل" }, { status: 400 });
  }
  if (NEEDS_APPOINTMENT.includes(kind) && !lead.appointment_at) {
    return NextResponse.json(
      { error: "حدد الموعد واحفظه أولاً قبل إرسال الرسالة" },
      { status: 400 }
    );
  }

  const dateStr = lead.appointment_at ? fmtDate(lead.appointment_at) : "";

  // Build the body variables ({{1}}, {{2}}, ...) and timeline text per template.
  let templateParams;
  let content;
  if (kind === "confirm") {
    templateParams = [lead.name, dateStr]; // {{1}} الاسم, {{2}} الموعد
    content = `مرحباً ${lead.name}، معك فريق عاصمة الكون للمصاعد.\nتم تحديد موعد زيارة المعاينة المجانية يوم ${dateStr}، سجل و تابع عاصمه الكون و ارتقي بمصعدك.\nبرجاء تأكيد الموعد بالرد بكلمة (تم). شكراً لك.`;
  } else if (kind === "reminder") {
    templateParams = [lead.name, dateStr]; // {{1}} الاسم, {{2}} الموعد
    content = `تذكير من عاصمة الكون للمصاعد ⏰\nمرحباً ${lead.name}، نذكّرك بموعد زيارة المعاينة المجانية يوم ${dateStr}.\nفي انتظارك، وبرجاء إبلاغنا فوراً لو رغبت في تغيير الموعد.`;
  } else if (kind === "welcome") {
    templateParams = [lead.name]; // {{1}} الاسم
    content = `مرحباً ${lead.name}، شكراً لتواصلك مع عاصمة الكون للمصاعد.\nاستلمنا طلبك لزيارة المعاينة المجانية، سجل و تابع عاصمه الكون و ارتقي بمصعدك. وسيتواصل معك فريقنا قريباً لتحديد الموعد المناسب.`;
  } else {
    // followup
    templateParams = [lead.name]; // {{1}} الاسم
    content = `مرحباً ${lead.name}، نشكرك على استضافتك لفريق عاصمة الكون للمصاعد.\nنتمنى أن تكون الزيارة قد نالت رضاك. لأي استفسار أو طلب صيانة، نحن في خدمتك دائماً.`;
  }

  try {
    await sendTemplate({
      to,
      name: lead.name,
      kind,
      params: templateParams,
      content,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Bevatel send error:", err);
    return NextResponse.json(
      { error: "تعذر إرسال الرسالة عبر بيفاتيل", detail: String(err.message || err) },
      { status: 502 }
    );
  }
}
