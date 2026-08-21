"use client";

import type { CompanyRecord, ContactPersonRecord, EmailRecord } from "@/lib/companies/types";
import { CompanyAnalysisEditor } from "./CompanyAnalysisEditor";
import { ContactPersonsTable } from "./ContactPersonsTable";
import { EmailTemplatesTable } from "./EmailTemplatesTable";
import { EmailsTable } from "./EmailsTable";

export function CompanyDetailClient({
  companyId,
  initialCompany,
  initialContacts,
  initialEmails,
}: {
  companyId: string;
  initialCompany: CompanyRecord;
  initialContacts: ContactPersonRecord[];
  initialEmails: EmailRecord[];
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
      <CompanyAnalysisEditor companyId={companyId} initialAnalysis={initialCompany.analysis} />
    </div>
  );
}
