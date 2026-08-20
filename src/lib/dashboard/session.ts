import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "dashboard_session";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifySessionCookie(value: string | undefined | null): Promise<boolean> {
  const expected = process.env.DASHBOARD_SESSION_TOKEN;
  if (!value || !expected) return false;

  const [actualDigest, expectedDigest] = await Promise.all([sha256Hex(value), sha256Hex(expected)]);
  return actualDigest === expectedDigest;
}

export async function requireDashboardAuth(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionCookie(cookie);
}
