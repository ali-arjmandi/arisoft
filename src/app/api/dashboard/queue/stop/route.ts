import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { setQueueRunning } from "@/lib/companyQueue/state";

export async function POST(request: NextRequest) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const state = await setQueueRunning(false);
  return NextResponse.json({ ok: true, isRunning: state.isRunning });
}
