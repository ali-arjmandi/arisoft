import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { listQueueItems } from "@/lib/companyQueue/queue";
import { getQueueState } from "@/lib/companyQueue/state";

// Read-only: processing itself is now driven by the scheduled
// /api/cron/tick, not by this route. QueuePageClient polls this purely to
// keep the list and running/stopped display live, including when another
// tab (or the cron job) is the one making progress.
export async function GET(request: NextRequest) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const [items, state] = await Promise.all([listQueueItems(), getQueueState()]);
  return NextResponse.json({ ok: true, isRunning: state.isRunning, items });
}
