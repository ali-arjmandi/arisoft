import { PanelNav } from "../PanelNav";
import { LogoutButton } from "../LogoutButton";
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

export default async function PanelCompanyAnalyzerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialResult = parseInitialResult(typeof params.data === "string" ? params.data : undefined);

  return (
    <div>
      <PanelNav />
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Company analyzer</h1>
          <p className="mt-2 text-sm text-body">
            Give it a company name and/or KVK number. It researches the company online and finds
            opportunities for Arisoft to help.
          </p>
        </div>
        <LogoutButton />
      </div>
      <CompanyAnalyzerForm initialResult={initialResult} />
    </div>
  );
}
