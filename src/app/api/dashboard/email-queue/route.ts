import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { listQueuedEmails } from "@/lib/companies/emails";
import { getEmailSendState } from "@/lib/email/publishState";

export async function GET(request: NextRequest) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const [items, state] = await Promise.all([listQueuedEmails(), getEmailSendState()]);
  return NextResponse.json({ ok: true, items, isRunning: state.isRunning });
}
