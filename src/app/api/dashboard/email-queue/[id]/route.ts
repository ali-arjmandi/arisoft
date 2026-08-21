import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { deleteQueuedEmail } from "@/lib/companies/emails";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteQueuedEmail(id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Queued email not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
