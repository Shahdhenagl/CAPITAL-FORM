import { NextResponse } from "next/server";
import { sessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "صيغة غير صحيحة" }, { status: 400 });
  }

  const password = (body.password || "").trim();
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: "لم يتم ضبط كلمة سر الداش بورد (DASHBOARD_PASSWORD)" },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json({ error: "كلمة السر غير صحيحة" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("cf_session", sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
