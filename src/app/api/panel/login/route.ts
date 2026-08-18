import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/panel/credentials";
import { SESSION_COOKIE_NAME } from "@/lib/panel/session";

export async function POST(request: Request) {
  const sessionToken = process.env.PANEL_SESSION_TOKEN;
  if (!sessionToken) {
    return NextResponse.json({ ok: false, error: "Panel is not configured." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { username, password } = (body as { username?: unknown; password?: unknown }) ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
  }

  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
