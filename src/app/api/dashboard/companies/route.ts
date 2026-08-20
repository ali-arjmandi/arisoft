import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { listCompanies, saveCompanyAnalysis } from "@/lib/companies/companies";
import { parseCompanyAnalysisInput } from "@/lib/companies/validate";

export async function GET(request: NextRequest) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const companies = await listCompanies();
  return NextResponse.json({ ok: true, companies });
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

  const record = body as Record<string, unknown> | null;
  const parsed = parseCompanyAnalysisInput(record?.analysis);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.errors.join(" ") }, { status: 400 });
  }

  try {
    const { company, created } = await saveCompanyAnalysis(parsed.data);
    return NextResponse.json({ ok: true, company, created }, { status: created ? 201 : 200 });
  } catch (error) {
    console.error("dashboard companies POST failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to save company." }, { status: 502 });
  }
}
