"use client";

import type { CompanyRecord, ContactPersonRecord, EmailRecord } from "@/lib/companies/types";
import type { ReportEngagement } from "@/lib/reports/reportEvents";
import { CompanyAnalysisEditor } from "./CompanyAnalysisEditor";
import { ContactPersonsTable } from "./ContactPersonsTable";
import { EmailTemplatesTable } from "./EmailTemplatesTable";
import { EmailsTable } from "./EmailsTable";
import { ReportShareCard } from "./ReportShareCard";

export function CompanyDetailClient({
  companyId,
  initialCompany,
  initialContacts,
  initialEmails,
  initialReportEngagement,
}: {
  companyId: string;
  initialCompany: CompanyRecord;
  initialContacts: ContactPersonRecord[];
  initialEmails: EmailRecord[];
  initialReportEngagement: ReportEngagement;
}) {
  const templates = initialEmails.filter((email) => email.status === "draft");
  const sentAndQueued = initialEmails.filter((email) => email.status !== "draft");

  return (
    <div className="space-y-8">
      <ContactPersonsTable
        companyId={companyId}
        initialContacts={initialContacts}
        suggestedContacts={initialCompany.analysis.decisionMakerContacts ?? []}
      />
      <EmailTemplatesTable companyId={companyId} initialTemplates={templates} />
      <EmailsTable initialEmails={sentAndQueued} />
      <ReportShareCard companyId={companyId} initialEngagement={initialReportEngagement} />
      <CompanyAnalysisEditor companyId={companyId} initialAnalysis={initialCompany.analysis} />
    </div>
  );
}
