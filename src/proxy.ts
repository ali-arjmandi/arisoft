import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/panel/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/panel") {
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

  return NextResponse.redirect(new URL("/panel", request.url));
}

export const config = {
  matcher: ["/panel/:path*", "/api/panel/send-email"],
};
