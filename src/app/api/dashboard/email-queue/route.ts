import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { listQueuedEmails } from "@/lib/companies/emails";

export async function GET(request: NextRequest) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const items = await listQueuedEmails();
  return NextResponse.json({ ok: true, items });
}
