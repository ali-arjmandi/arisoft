import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { runQueueTick } from "@/lib/companyQueue/processing";
import { listQueueItems } from "@/lib/companyQueue/queue";

// Claims and processes up to QUEUE_BATCH_SIZE waiting items, then returns
// the full fresh list so the client can re-render without a second round
// trip. Always 200 for an authenticated caller, even when isRunning is
// false (a safe no-op poll) — the client's polling loop treats a fetch
// failure as "try again next cycle," never as a hard error.
export async function POST(request: NextRequest) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { isRunning } = await runQueueTick();
  const items = await listQueueItems();
  return NextResponse.json({ ok: true, isRunning, items });
}
