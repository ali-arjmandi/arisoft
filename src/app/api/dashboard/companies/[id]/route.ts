import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { deleteCompany, getCompanyWithDetails, updateCompany } from "@/lib/companies/companies";
import { parseCompanyAnalysisInput } from "@/lib/companies/validate";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const details = await getCompanyWithDetails(id);
  if (!details) {
    return NextResponse.json({ ok: false, error: "Company not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...details });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

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
    const company = await updateCompany(id, parsed.data);
    if (!company) {
      return NextResponse.json({ ok: false, error: "Company not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, company });
  } catch (error) {
    console.error("dashboard companies PATCH failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to update company." }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteCompany(id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Company not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
