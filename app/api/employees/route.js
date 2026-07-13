import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the list of marketing employees (for the dashboard drop-down).
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("employees")
      .select("name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Employees fetch error:", error);
      return NextResponse.json({ employees: [] }, { status: 200 });
    }
    return NextResponse.json({ employees: (data || []).map((e) => e.name) });
  } catch (err) {
    console.error("Employees GET error:", err);
    return NextResponse.json({ employees: [] }, { status: 200 });
  }
}

// Registers a new marketing employee name (idempotent — ignores duplicates).
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "صيغة غير صحيحة" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "اسم الموظف مطلوب" }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("employees")
      .upsert({ name }, { onConflict: "name", ignoreDuplicates: true });

    if (error) {
      console.error("Employee insert error:", error);
      return NextResponse.json({ error: "تعذر حفظ الموظف" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, name });
  } catch (err) {
    console.error("Employees POST error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
