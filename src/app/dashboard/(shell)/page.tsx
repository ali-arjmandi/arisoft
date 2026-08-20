import Link from "next/link";
import { getDashboardOverview } from "@/lib/dashboard/stats";
import { StatCard } from "./StatCard";
import { BuildingIcon, MailIcon, UsersIcon } from "./icons";

// Reads live data from the database on every request — must not be
// statically prerendered at build time (build has no DB connection).
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function DashboardOverviewPage() {
  const overview = await getDashboardOverview();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BuildingIcon} label="Companies" value={overview.totalCompanies} tone="primary" />
        <StatCard icon={UsersIcon} label="Contact persons" value={overview.totalContacts} tone="success" />
        <StatCard icon={MailIcon} label="Emails sent (all time)" value={overview.totalEmailsSent} tone="warning" />
        <StatCard
          icon={MailIcon}
          label="Emails sent (last 7 days)"
          value={overview.emailsSentLast7Days}
          tone="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent companies</h2>
            <Link href="/dashboard/companies" className="text-sm font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          {overview.recentCompanies.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No companies saved yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {overview.recentCompanies.map((company) => (
                <li key={company.id}>
                  <Link
                    href={`/dashboard/companies/${company.id}`}
                    className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary"
                  >
                    <span className="font-medium text-foreground">{company.companyName}</span>
                    <span className="shrink-0 text-muted">{formatDate(company.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Recent emails sent</h2>
          {overview.recentEmails.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No emails sent yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {overview.recentEmails.map((email) => (
                <li key={email.id}>
                  <Link
                    href={`/dashboard/companies/${email.companyId}`}
                    className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary"
                  >
                    <span>
                      <span className="font-medium text-foreground">
                        {email.contactNameSnapshot ?? email.contactEmailSnapshot}
                      </span>
                      <span className="text-muted"> · {email.companyName}</span>
                    </span>
                    <span className="shrink-0 text-muted">{formatDate(email.sentAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
