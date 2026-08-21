import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/dashboard/cronAuth";
import { runQueueTick } from "@/lib/companyQueue/processing";
import { runEmailSendTick } from "@/lib/email/publishTick";

// The single scheduled entry point that drives both background processors
// (company queue, email auto-publish) now that neither depends on a
// browser tab staying open to poll a tick route. No dashboard session
// cookie here — the caller is an external scheduler, authenticated via
// CRON_SECRET instead (see requireCronAuth). Each tick is independently
// gated by its own isRunning flag, so calling this on a fixed schedule is
// safe even when both, one, or neither processor is actually running.
export async function POST(request: NextRequest) {
  if (!(await requireCronAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const [queue, email] = await Promise.all([runQueueTick(), runEmailSendTick()]);
  return NextResponse.json({ ok: true, queue, email });
}
