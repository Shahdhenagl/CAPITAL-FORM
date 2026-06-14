import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { notifyTelegram } from "@/lib/telegram";

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
  const notes = (body.notes || "").trim();
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

  const lead = {
    name,
    phone,
    whatsapp: whatsapp || null,
    facility_type: facility_type || null,
    address: address || null,
    notes: notes || null,
    lat,
    lng,
    maps_link,
    status: "new",
  };

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("leads")
      .insert(lead)
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "تعذر حفظ الطلب، حاول مرة أخرى" },
        { status: 500 }
      );
    }

    // Notify Telegram (non-blocking failure).
    await notifyTelegram(data);

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json(
      { error: "خطأ في الخادم، تأكد من إعداد قاعدة البيانات" },
      { status: 500 }
    );
  }
}
