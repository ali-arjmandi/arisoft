import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/dashboard/session";

// Login/logout must stay reachable without a valid session cookie — you
// can't require a session to grant one, and logout must be able to clear a
// stale/invalid cookie.
const PUBLIC_API_PATHS = new Set(["/api/dashboard/login", "/api/dashboard/logout"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/dashboard/login" || PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await verifySessionCookie(cookie);

  if (authenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/dashboard/login", request.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/dashboard/:path*"],
};
