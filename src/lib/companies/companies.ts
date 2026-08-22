import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companies, contactPersons, emails, reportEvents } from "@/lib/db/schema";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import type { CompanyListItem, CompanyRecord, CompanyWithDetails, ContactPersonRecord } from "./types";

// Best-effort: a company save must always succeed even if auto-adding
// contacts fails for some reason, so failures here are logged, not thrown.
// A contact with a found email is deduped by email; one without (the AI
// found a name but no address) is deduped by name instead, since there's
// no other stable identifier for it — so re-saving/regenerating an
// analysis never creates duplicates either way.
async function autoCreateDecisionMakerContacts(companyId: string, analysis: CompanyAnalysis): Promise<void> {
  try {
    const db = getDb();
    const existing = await db
      .select({ name: contactPersons.name, email: contactPersons.email })
      .from(contactPersons)
      .where(eq(contactPersons.companyId, companyId));
    const knownEmails = new Set(existing.filter((row) => row.email).map((row) => row.email!.toLowerCase()));
    const knownNames = new Set(existing.map((row) => row.name.toLowerCase()));

    const toCreate: (typeof contactPersons.$inferInsert)[] = [];
    for (const contact of analysis.decisionMakerContacts ?? []) {
      const email = contact.email?.toLowerCase() ?? null;
      const name = contact.name.toLowerCase();
      if (email ? knownEmails.has(email) : knownNames.has(name)) continue;
      if (email) knownEmails.add(email);
      else knownNames.add(name);
      toCreate.push({ companyId, name: contact.name, role: contact.role, email: contact.email, phone: contact.phone });
    }

    if (toCreate.length > 0) {
      await db.insert(contactPersons).values(toCreate);
    }
  } catch (error) {
    console.error("Failed to auto-create decision maker contacts:", error);
  }
}

export async function listCompanies(): Promise<CompanyListItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: companies.id,
      companyName: companies.companyName,
      kvkNumber: companies.kvkNumber,
      createdAt: companies.createdAt,
      // Counted via a subquery rather than a join, so it isn't inflated by
      // the emails join's fan-out.
      contactCount: sql<number>`(select count(*) from ${contactPersons} where ${contactPersons.companyId} = ${companies.id})`,
      // Only counts rows that have actually been sent — draft/queued rows
      // don't count as "sent" yet.
      emailCount: sql<number>`count(${emails.id}) filter (where ${emails.status} = 'sent')`,
      // Also decorrelated scalar subqueries, not joins — a second left join
      // here would fan out against the emails join above, inflating counts.
      viewCount: sql<number>`(select count(*) from ${reportEvents} where ${reportEvents.companyId} = ${companies.id} and ${reportEvents.type} = 'view')`,
      downloadCount: sql<number>`(select count(*) from ${reportEvents} where ${reportEvents.companyId} = ${companies.id} and ${reportEvents.type} = 'download')`,
    })
    .from(companies)
    .leftJoin(emails, eq(emails.companyId, companies.id))
    .groupBy(companies.id)
    .orderBy(desc(companies.createdAt));

  return rows.map((row) => ({
    ...row,
    contactCount: Number(row.contactCount),
    emailCount: Number(row.emailCount),
    viewCount: Number(row.viewCount),
    downloadCount: Number(row.downloadCount),
  }));
}

export async function getCompanyById(id: string): Promise<CompanyRecord | null> {
  const db = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return company ?? null;
}

export async function getContactPersonsByCompanyId(companyId: string): Promise<ContactPersonRecord[]> {
  const db = getDb();
  return db
    .select()
    .from(contactPersons)
    .where(eq(contactPersons.companyId, companyId))
    .orderBy(desc(contactPersons.createdAt));
}

export async function getCompanyWithDetails(id: string): Promise<CompanyWithDetails | null> {
  const db = getDb();
  const company = await getCompanyById(id);
  if (!company) return null;

  const [contacts, companyEmails] = await Promise.all([
    getContactPersonsByCompanyId(id),
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
      await autoCreateDecisionMakerContacts(updated.id, analysis);
      return { company: updated, created: false };
    }
  }

  const [created] = await db
    .insert(companies)
    .values({ companyName: analysis.companyName, kvkNumber: analysis.kvkNumber, analysis })
    .returning();
  await autoCreateDecisionMakerContacts(created.id, analysis);
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
  if (!updated) return null;
  await autoCreateDecisionMakerContacts(updated.id, analysis);
  return updated;
}

export async function deleteCompany(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db.delete(companies).where(eq(companies.id, id)).returning({ id: companies.id });
  return deleted.length > 0;
}
