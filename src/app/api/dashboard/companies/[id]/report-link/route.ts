import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { getCompanyById } from "@/lib/companies/companies";
import { getOrCreateReportUrl } from "@/lib/reports/reportLinks";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company) {
    return NextResponse.json({ ok: false, error: "Company not found." }, { status: 404 });
  }

  const url = await getOrCreateReportUrl(id);
  return NextResponse.json({ ok: true, url });
}
