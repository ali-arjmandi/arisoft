import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/panel/session";
import { analyzeCompany } from "@/lib/companyAnalyzer/analyzeCompany";

function readOptionalString(body: unknown, key: string): string | null {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await verifySessionCookie(cookie))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const companyName = readOptionalString(body, "companyName");
  const kvkNumber = readOptionalString(body, "kvkNumber");

  if (!companyName && !kvkNumber) {
    return NextResponse.json(
      { ok: false, error: "Provide a company name or KVK number." },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeCompany({ companyName, kvkNumber });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("panel analyze-company failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to analyze company." },
      { status: 502 },
    );
  }
}
