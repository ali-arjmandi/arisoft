import { CompanyAnalyzerForm } from "./CompanyAnalyzerForm";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";

function parseInitialResult(raw: string | undefined): CompanyAnalysis | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { companyName?: unknown }).companyName === "string"
    ) {
      return parsed as CompanyAnalysis;
    }
  } catch {
    // ignore malformed handoff data from a downloaded report
  }
  return null;
}

export default async function DashboardCompanyAnalyzerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialResult = parseInitialResult(typeof params.data === "string" ? params.data : undefined);

  return <CompanyAnalyzerForm initialResult={initialResult} />;
}
