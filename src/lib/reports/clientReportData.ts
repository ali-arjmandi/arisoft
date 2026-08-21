import type { ArisoftService, CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";

export interface ClientReportOpportunity {
  opportunity: string;
  arisoftService: ArisoftService;
  explanation: string;
  isBestMatch: boolean;
}

export interface ClientReportData {
  companyName: string;
  kvkNumber: string | null;
  websiteUrl: string | null;
  industrySubsegment: string | null;
  companySummary: string;
  servicesListed: string[];
  manualProcessSignals: string[];
  opportunities: ClientReportOpportunity[];
}

// Curates the internal CompanyAnalysis down to what's safe to hand a
// prospect. Deliberately drops: fitScore/fitScoreReason (sales scoring of
// the prospect), outreachAngle/researchNotes/researchBrief (internal sales
// strategy and caveats), contact/decisionMakerContacts (their own staff's
// scraped contact info — odd and faintly invasive to show back to them),
// websiteConfidence/estimatedSizeSignal (internal research-quality
// signals, meaningless to a client), and evidenceSource on each
// opportunity (an internal citation of where in the research this came
// from). This is the single source of truth for both the landing page and
// the PDF, so they can never drift apart.
export function buildClientReportData(analysis: CompanyAnalysis): ClientReportData {
  return {
    companyName: analysis.companyName,
    kvkNumber: analysis.kvkNumber,
    websiteUrl: analysis.websiteUrl,
    industrySubsegment: analysis.industrySubsegment,
    companySummary: analysis.companySummary,
    servicesListed: analysis.websiteFindings.servicesListed,
    manualProcessSignals: analysis.websiteFindings.manualProcessSignals,
    opportunities: analysis.automationOpportunities.map((opportunity) => ({
      opportunity: opportunity.opportunity,
      arisoftService: opportunity.arisoftService,
      explanation: opportunity.explanation,
      isBestMatch: opportunity.isBestMatch,
    })),
  };
}
