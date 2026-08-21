import { notFound } from "next/navigation";
import { getCompanyIdByReportToken } from "@/lib/reports/reportLinks";
import { getCompanyById } from "@/lib/companies/companies";
import { buildClientReportData } from "@/lib/reports/clientReportData";
import { ReportPageClient } from "./ReportPageClient";

// Reads live data on every request — a report link must always reflect the
// company's current analysis, and must not be statically prerendered at
// build time (build has no DB connection).
export const dynamic = "force-dynamic";

interface ReportPageProps {
  params: Promise<{ token: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { token } = await params;

  const companyId = await getCompanyIdByReportToken(token);
  if (!companyId) notFound();

  const company = await getCompanyById(companyId);
  if (!company) notFound();

  const data = buildClientReportData(company.analysis);

  return <ReportPageClient token={token} data={data} />;
}
