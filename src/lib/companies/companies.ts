import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companies, contactPersons, emails } from "@/lib/db/schema";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import type { CompanyListItem, CompanyRecord, CompanyWithDetails } from "./types";

export async function listCompanies(): Promise<CompanyListItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: companies.id,
      companyName: companies.companyName,
      kvkNumber: companies.kvkNumber,
      createdAt: companies.createdAt,
      // Only counts rows that have actually been sent — queued (sent_at
      // null) rows created by the company queue don't count as "sent" yet.
      emailCount: sql<number>`count(${emails.id}) filter (where ${emails.sentAt} is not null)`,
    })
    .from(companies)
    .leftJoin(emails, eq(emails.companyId, companies.id))
    .groupBy(companies.id)
    .orderBy(desc(companies.createdAt));

  return rows.map((row) => ({ ...row, emailCount: Number(row.emailCount) }));
}

export async function getCompanyById(id: string): Promise<CompanyRecord | null> {
  const db = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return company ?? null;
}

export async function getCompanyWithDetails(id: string): Promise<CompanyWithDetails | null> {
  const db = getDb();
  const company = await getCompanyById(id);
  if (!company) return null;

  const [contacts, companyEmails] = await Promise.all([
    db
      .select()
      .from(contactPersons)
      .where(eq(contactPersons.companyId, id))
      .orderBy(desc(contactPersons.createdAt)),
    // Ordered by created_at, not sent_at — sent_at is null for queued
    // (not-yet-sent) rows so it's no longer a reliable ordering key.
    db.select().from(emails).where(eq(emails.companyId, id)).orderBy(desc(emails.createdAt)),
  ]);

  return { company, contacts, emails: companyEmails };
}

// Saves a freshly-run analysis. If a company with the same KVK number
// already exists, updates it in place instead of creating a duplicate.
export async function saveCompanyAnalysis(
  analysis: CompanyAnalysis,
): Promise<{ company: CompanyRecord; created: boolean }> {
  const db = getDb();
  if (analysis.kvkNumber) {
    const [existing] = await db.select().from(companies).where(eq(companies.kvkNumber, analysis.kvkNumber)).limit(1);

    if (existing) {
      const [updated] = await db
        .update(companies)
        .set({
          companyName: analysis.companyName,
          kvkNumber: analysis.kvkNumber,
          analysis,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, existing.id))
        .returning();
      return { company: updated, created: false };
    }
  }

  const [created] = await db
    .insert(companies)
    .values({ companyName: analysis.companyName, kvkNumber: analysis.kvkNumber, analysis })
    .returning();
  return { company: created, created: true };
}

export async function updateCompany(id: string, analysis: CompanyAnalysis): Promise<CompanyRecord | null> {
  const db = getDb();
  const [updated] = await db
    .update(companies)
    .set({
      companyName: analysis.companyName,
      kvkNumber: analysis.kvkNumber,
      analysis,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteCompany(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db.delete(companies).where(eq(companies.id, id)).returning({ id: companies.id });
  return deleted.length > 0;
}
