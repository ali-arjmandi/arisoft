import { notFound } from "next/navigation";
import { getCompanyWithDetails } from "@/lib/companies/companies";
import { CompanyDetailClient } from "./CompanyDetailClient";

// Reads live data from the database on every request — must not be
// statically prerendered at build time (build has no DB connection).
export const dynamic = "force-dynamic";

export default async function DashboardCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const details = await getCompanyWithDetails(id);
  if (!details) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{details.company.companyName}</h1>
        <p className="mt-1 text-sm text-body">Saved company analysis, contacts, and email history.</p>
      </div>
      <CompanyDetailClient
        companyId={id}
        initialCompany={details.company}
        initialContacts={details.contacts}
        initialEmails={details.emails}
      />
    </div>
  );
}
