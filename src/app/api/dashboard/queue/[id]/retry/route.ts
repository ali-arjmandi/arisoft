import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { retryQueueItem } from "@/lib/companyQueue/queue";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const item = await retryQueueItem(id);
  if (!item) {
    return NextResponse.json({ ok: false, error: "Only failed items can be retried." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, item });
}
