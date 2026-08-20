"use client";

import type { CompanyRecord, ContactPersonRecord, EmailSentRecord } from "@/lib/companies/types";
import { CompanyAnalysisEditor } from "./CompanyAnalysisEditor";
import { ContactPersonsTable } from "./ContactPersonsTable";
import { EmailsSentTable } from "./EmailsSentTable";

export function CompanyDetailClient({
  companyId,
  initialCompany,
  initialContacts,
  initialEmailsSent,
}: {
  companyId: string;
  initialCompany: CompanyRecord;
  initialContacts: ContactPersonRecord[];
  initialEmailsSent: EmailSentRecord[];
}) {
  return (
    <div className="space-y-8">
      <ContactPersonsTable companyId={companyId} initialContacts={initialContacts} />
      <EmailsSentTable emails={initialEmailsSent} />
      <CompanyAnalysisEditor companyId={companyId} initialAnalysis={initialCompany.analysis} />
    </div>
  );
}
