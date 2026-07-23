import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { notifyTelegram } from "@/lib/telegram";
import { sendTemplate } from "@/lib/bevatel";

export const runtime = "nodejs";

const VALID_FACILITY = ["hotel", "company", "building", "other"];

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "صيغة غير صحيحة" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const phone = (body.phone || "").trim();
  const whatsapp = (body.whatsapp || "").trim();
  const facility_type = (body.facility_type || "").trim();
  const address = (body.address || "").trim();
  const request_type = (body.request_type || "").trim();
  const notes = (body.notes || "").trim();
  const employee_name = (body.employee_name || "").trim();
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lng = typeof body.lng === "number" ? body.lng : null;

  if (!name || !phone) {
    return NextResponse.json(
      { error: "الاسم ورقم الجوال مطلوبان" },
      { status: 400 }
    );
  }
  if (facility_type && !VALID_FACILITY.includes(facility_type)) {
    return NextResponse.json({ error: "نوع منشأة غير صحيح" }, { status: 400 });
  }

  const maps_link =
    lat != null && lng != null
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : null;

  let finalNotes = notes;
  if (request_type) {
    const typeLabel = request_type === "maintenance" ? "صيانة" : (request_type === "installation" ? "تركيب" : request_type);
    finalNotes = finalNotes ? `[نوع الطلب: ${typeLabel}]\n${finalNotes}` : `[نوع الطلب: ${typeLabel}]`;
  }

  const lead = {
    name,
    phone,
    whatsapp: whatsapp || null,
    facility_type: facility_type || null,
    address: address || null,
    notes: finalNotes || null,
    lat,
    lng,
    maps_link,
    status: "new",
    employee_name: employee_name || null,
  };

  try {
    const supabase = getSupabase();
    let { data, error } = await supabase
      .from("leads")
      .insert(lead)
      .select()
      .single();

    // Fallback: if the DB migration (employee_name column) hasn't been applied
    // yet, retry without it so the public form keeps working.
    if (error && /employee_name/i.test(error.message || "")) {
      const { employee_name: _omit, ...legacyLead } = lead;
      ({ data, error } = await supabase
        .from("leads")
        .insert(legacyLead)
        .select()
        .single());
    }

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "تعذر حفظ الطلب، حاول مرة أخرى" },
        { status: 500 }
      );
    }

    // Register the marketing employee so their name appears in the drop-down
    // next time (idempotent — duplicates are ignored).
    if (employee_name) {
      try {
        await supabase
          .from("employees")
          .upsert(
            { name: employee_name },
            { onConflict: "name", ignoreDuplicates: true }
          );
      } catch (err) {
        console.error("Employee upsert failed:", err);
      }
    }

    // Notify Telegram (non-blocking failure).
    await notifyTelegram(data);

    // Send WhatsApp welcome via Bevatel (non-blocking failure).
    const waTo = data.whatsapp || data.phone;
    if (waTo) {
      try {
        await sendTemplate({
          to: waTo,
          name: data.name,
          kind: "welcome",
          params: [data.name],
          content: `مرحباً ${data.name}، شكراً لتواصلك مع عاصمة الكون للمصاعد.\nتم استلام طلبك بنجاح، وسيتواصل معك فريقنا هاتفياً في أقرب وقت.`,
        });
      } catch (err) {
        console.error("Bevatel welcome failed:", err);
      }
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json(
      { error: "خطأ في الخادم، تأكد من إعداد قاعدة البيانات" },
      { status: 500 }
    );
  }
}
