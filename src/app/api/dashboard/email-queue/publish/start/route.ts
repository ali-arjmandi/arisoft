import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { setEmailSendRunning } from "@/lib/email/publishState";

export async function POST(request: NextRequest) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const state = await setEmailSendRunning(true);
  return NextResponse.json({ ok: true, isRunning: state.isRunning });
}
