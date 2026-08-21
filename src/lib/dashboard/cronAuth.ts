import type { NextRequest } from "next/server";
import { hashesMatch } from "./hashCompare";

// Cron-triggered requests (an external scheduler, not a browser) carry no
// dashboard session cookie, so /api/cron/tick authenticates with a bearer
// secret instead of requireDashboardAuth's cookie check.
export async function requireCronAuth(request: NextRequest): Promise<boolean> {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!provided) return false;

  return hashesMatch(provided, expected);
}
