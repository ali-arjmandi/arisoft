import { and, count, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companies, contactPersons, emails } from "@/lib/db/schema";
import { listCompanies } from "@/lib/companies/companies";
import type { CompanyListItem } from "@/lib/companies/types";
import type { EmailContent } from "@/lib/email/content";
import type { AllowedSender } from "@/lib/email/senders";

const RECENT_LIMIT = 5;

export interface RecentEmail {
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
  recentEmails: RecentEmail[];
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const db = getDb();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // All of these are specifically "sent" metrics, so draft/queued rows are
  // excluded throughout.
  const [[companyCountRow], [contactCountRow], [emailCountRow], [recentEmailCountRow], allCompanies, recentEmails] =
    await Promise.all([
      db.select({ value: count() }).from(companies),
      db.select({ value: count() }).from(contactPersons),
      db.select({ value: count() }).from(emails).where(eq(emails.status, "sent")),
      db
        .select({ value: count() })
        .from(emails)
        .where(and(eq(emails.status, "sent"), gte(emails.sentAt, sevenDaysAgo))),
      listCompanies(),
      db
        .select({
          id: emails.id,
          companyId: emails.companyId,
          companyName: companies.companyName,
          contactNameSnapshot: emails.contactNameSnapshot,
          contactEmailSnapshot: emails.contactEmailSnapshot,
          fromSender: emails.fromSender,
          content: emails.content,
          sentAt: emails.sentAt,
        })
        .from(emails)
        .innerJoin(companies, eq(companies.id, emails.companyId))
        .where(eq(emails.status, "sent"))
        .orderBy(desc(emails.sentAt))
        .limit(RECENT_LIMIT),
    ]);

  return {
    totalCompanies: Number(companyCountRow.value),
    totalContacts: Number(contactCountRow.value),
    totalEmailsSent: Number(emailCountRow.value),
    emailsSentLast7Days: Number(recentEmailCountRow.value),
    recentCompanies: allCompanies.slice(0, RECENT_LIMIT),
    // sentAt is typed nullable at the column level, but the isNotNull filter
    // above guarantees every row here actually has one.
    recentEmails: recentEmails.map((row) => ({ ...row, sentAt: row.sentAt as Date })),
  };
}
