import { count, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companies, contactPersons, emailsSent } from "@/lib/db/schema";
import { listCompanies } from "@/lib/companies/companies";
import type { CompanyListItem } from "@/lib/companies/types";
import type { EmailContent } from "@/lib/email/content";
import type { AllowedSender } from "@/lib/email/senders";

const RECENT_LIMIT = 5;

export interface RecentEmailSent {
  id: string;
  companyId: string;
  companyName: string;
  contactNameSnapshot: string | null;
  contactEmailSnapshot: string;
  fromSender: AllowedSender;
  content: EmailContent;
  sentAt: Date;
}

export interface DashboardOverview {
  totalCompanies: number;
  totalContacts: number;
  totalEmailsSent: number;
  emailsSentLast7Days: number;
  recentCompanies: CompanyListItem[];
  recentEmails: RecentEmailSent[];
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const db = getDb();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[companyCountRow], [contactCountRow], [emailCountRow], [recentEmailCountRow], allCompanies, recentEmails] =
    await Promise.all([
      db.select({ value: count() }).from(companies),
      db.select({ value: count() }).from(contactPersons),
      db.select({ value: count() }).from(emailsSent),
      db.select({ value: count() }).from(emailsSent).where(gte(emailsSent.sentAt, sevenDaysAgo)),
      listCompanies(),
      db
        .select({
          id: emailsSent.id,
          companyId: emailsSent.companyId,
          companyName: companies.companyName,
          contactNameSnapshot: emailsSent.contactNameSnapshot,
          contactEmailSnapshot: emailsSent.contactEmailSnapshot,
          fromSender: emailsSent.fromSender,
          content: emailsSent.content,
          sentAt: emailsSent.sentAt,
        })
        .from(emailsSent)
        .innerJoin(companies, eq(companies.id, emailsSent.companyId))
        .orderBy(desc(emailsSent.sentAt))
        .limit(RECENT_LIMIT),
    ]);

  return {
    totalCompanies: Number(companyCountRow.value),
    totalContacts: Number(contactCountRow.value),
    totalEmailsSent: Number(emailCountRow.value),
    emailsSentLast7Days: Number(recentEmailCountRow.value),
    recentCompanies: allCompanies.slice(0, RECENT_LIMIT),
    recentEmails,
  };
}
