import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { setGenerateEmailsMode } from "@/lib/companyQueue/state";
import { GENERATE_EMAILS_MODES, type GenerateEmailsMode } from "@/lib/companyQueue/status";

function isGenerateEmailsMode(value: unknown): value is GenerateEmailsMode {
  return typeof value === "string" && (GENERATE_EMAILS_MODES as string[]).includes(value);
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

  const mode = (body as Record<string, unknown> | null)?.mode;
  if (!isGenerateEmailsMode(mode)) {
    return NextResponse.json(
      { ok: false, error: `Field "mode" must be one of: ${GENERATE_EMAILS_MODES.join(", ")}.` },
      { status: 400 },
    );
  }

  const state = await setGenerateEmailsMode(mode);
  return NextResponse.json({ ok: true, generateEmailsMode: state.generateEmailsMode });
}
