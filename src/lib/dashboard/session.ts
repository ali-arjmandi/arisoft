import type { NextRequest } from "next/server";
import { hashesMatch } from "./hashCompare";

export const SESSION_COOKIE_NAME = "dashboard_session";

export async function verifySessionCookie(value: string | undefined | null): Promise<boolean> {
  const expected = process.env.DASHBOARD_SESSION_TOKEN;
  if (!value || !expected) return false;

  return hashesMatch(value, expected);
}

export async function requireDashboardAuth(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionCookie(cookie);
}
