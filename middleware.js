import { NextResponse } from "next/server";

export const config = {
  matcher: ["/dashboard/:path*"],
};

function sessionToken() {
  return (
    process.env.SESSION_SECRET ||
    "cf-session-" + (process.env.DASHBOARD_PASSWORD || "changeme")
  );
}

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Allow the login page itself.
  if (pathname === "/dashboard/login") {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("cf_session")?.value;
  if (cookie && cookie === sessionToken()) {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/dashboard/login";
  return NextResponse.redirect(loginUrl);
}
