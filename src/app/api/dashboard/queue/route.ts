import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { addQueueItem, listQueueItems } from "@/lib/companyQueue/queue";
import { parseQueueItemInput } from "@/lib/companyQueue/validate";

export async function GET(request: NextRequest) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const items = await listQueueItems();
  return NextResponse.json({ ok: true, items });
}

export async function POST(request: NextRequest) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseQueueItemInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.errors.join(" ") }, { status: 400 });
  }

  const item = await addQueueItem(parsed.data);
  return NextResponse.json({ ok: true, item }, { status: 201 });
}
