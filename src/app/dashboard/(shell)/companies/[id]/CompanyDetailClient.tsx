"use client";

import type { CompanyRecord, ContactPersonRecord, EmailRecord } from "@/lib/companies/types";
import { CompanyAnalysisEditor } from "./CompanyAnalysisEditor";
import { ContactPersonsTable } from "./ContactPersonsTable";
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
  return (
    <div className="space-y-8">
      <ContactPersonsTable
        companyId={companyId}
        initialContacts={initialContacts}
        suggestedContacts={initialCompany.analysis.decisionMakerContacts ?? []}
      />
      <EmailsTable companyId={companyId} initialEmails={initialEmails} />
      <CompanyAnalysisEditor companyId={companyId} initialAnalysis={initialCompany.analysis} />
    </div>
  );
}
