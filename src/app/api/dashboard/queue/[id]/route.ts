import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { deleteQueueItem } from "@/lib/companyQueue/queue";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteQueueItem(id);
  if (!deleted) {
    return NextResponse.json(
      { ok: false, error: "Item not found, or it can't be deleted while processing or done." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
