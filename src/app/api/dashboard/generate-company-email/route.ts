import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/dashboard/session";
import { generateOutreachEmail } from "@/lib/companyAnalyzer/generateOutreachEmail";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";

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

  const analysis = body as Partial<CompanyAnalysis> | null;
  if (!analysis || typeof analysis !== "object" || typeof analysis.companyName !== "string" || !analysis.companyName.trim()) {
    return NextResponse.json({ ok: false, error: "Missing company analysis." }, { status: 400 });
  }

  try {
    const content = await generateOutreachEmail(analysis as CompanyAnalysis);
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    console.error("dashboard generate-company-email failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to generate email." },
      { status: 502 },
    );
  }
}
