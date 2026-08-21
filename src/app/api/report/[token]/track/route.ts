import { NextResponse, type NextRequest } from "next/server";
import { getCompanyIdByReportToken } from "@/lib/reports/reportLinks";
import { recordReportEvent } from "@/lib/reports/reportEvents";
import { REPORT_EVENT_TYPES } from "@/lib/reports/reportEventType";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// Public, unauthenticated by design — this is what the public report
// landing page beacons from the visitor's own browser. See
// src/proxy.ts: only /dashboard/:path* and /api/dashboard/:path* are
// gated, so this route needs no carve-out.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const type = (body as { type?: unknown })?.type;
  if (typeof type !== "string" || !REPORT_EVENT_TYPES.includes(type as (typeof REPORT_EVENT_TYPES)[number])) {
    return NextResponse.json({ ok: false, error: "Invalid event type." }, { status: 400 });
  }

  const companyId = await getCompanyIdByReportToken(token);
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "Report not found." }, { status: 404 });
  }

  await recordReportEvent(companyId, type as (typeof REPORT_EVENT_TYPES)[number]);
  return NextResponse.json({ ok: true });
}
