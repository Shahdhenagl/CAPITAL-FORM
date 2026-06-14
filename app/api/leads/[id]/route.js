import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { sessionToken } from "@/lib/auth";

export const runtime = "nodejs";

function authorized() {
  const c = cookies().get("cf_session")?.value;
  return c && c === sessionToken();
}

const VALID_STATUS = ["new", "scheduled", "done"];

export async function PATCH(req, { params }) {
  if (!authorized()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "صيغة غير صحيحة" }, { status: 400 });
  }

  const update = {};
  if (typeof body.status === "string") {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: "حالة غير صحيحة" }, { status: 400 });
    }
    update.status = body.status;
  }
  if ("appointment_at" in body) {
    update.appointment_at = body.appointment_at || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "لا يوجد تحديث" }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("leads")
      .update(update)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: "تعذر التحديث" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, lead: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  if (!authorized()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("leads").delete().eq("id", params.id);
    if (error) {
      return NextResponse.json({ error: "تعذر الحذف" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
