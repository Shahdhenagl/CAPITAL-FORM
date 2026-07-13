import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { sessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized() {
  const c = cookies().get("cf_session")?.value;
  return c && c === sessionToken();
}

// Lightweight endpoint the dashboard polls to detect newly arrived leads.
export async function GET() {
  if (!authorized()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    const supabase = getSupabase();
    let { data, count, error } = await supabase
      .from("leads")
      .select("created_at, name, employee_name", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(1);

    // Fallback if the employee_name column hasn't been migrated yet.
    if (error && /employee_name/i.test(error.message || "")) {
      ({ data, count, error } = await supabase
        .from("leads")
        .select("created_at, name", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(1));
    }
    if (error) {
      return NextResponse.json({ error: "تعذر القراءة" }, { status: 500 });
    }
    const latest = data?.[0] || null;
    return NextResponse.json({
      count: count ?? 0,
      latest: latest?.created_at ?? null,
      latestName: latest?.name ?? null,
      latestEmployee: latest?.employee_name ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
