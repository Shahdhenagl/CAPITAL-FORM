// Shared session token used by the login route and the middleware.
export function sessionToken() {
  return (
    process.env.SESSION_SECRET ||
    "cf-session-" + (process.env.DASHBOARD_PASSWORD || "changeme")
  );
}
