import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/panel/session";
import { generateOutreachEmail } from "@/lib/companyAnalyzer/generateOutreachEmail";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await verifySessionCookie(cookie))) {
    return NextResponse.redirect(new URL("/panel", request.url), 303);
  }

  const formData = await request.formData();

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("analysis") ?? ""));
  } catch {
    return NextResponse.redirect(new URL("/panel/company-analyzer", request.url), 303);
  }

  const analysis = parsed as Partial<CompanyAnalysis> | null;
  if (!analysis || typeof analysis !== "object" || typeof analysis.companyName !== "string" || !analysis.companyName.trim()) {
    return NextResponse.redirect(new URL("/panel/company-analyzer", request.url), 303);
  }

  try {
    const content = await generateOutreachEmail(analysis as CompanyAnalysis);
    const url = new URL("/panel/email", request.url);
    url.searchParams.set("prefill", JSON.stringify(content));
    return NextResponse.redirect(url, 303);
  } catch (error) {
    console.error("panel report-generate-email failed:", error);
    return NextResponse.redirect(new URL("/panel/company-analyzer", request.url), 303);
  }
}
