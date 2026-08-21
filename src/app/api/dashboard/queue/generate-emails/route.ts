import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { setGenerateEmails } from "@/lib/companyQueue/state";

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

  const enabled = (body as Record<string, unknown> | null)?.enabled;
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: 'Field "enabled" must be a boolean.' }, { status: 400 });
  }

  const state = await setGenerateEmails(enabled);
  return NextResponse.json({ ok: true, generateEmails: state.generateEmails });
}
