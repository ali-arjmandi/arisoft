import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companies, contactPersons } from "@/lib/db/schema";
import type { ContactPersonInput, ContactPersonRecord } from "./types";

export async function createContactPerson(
  companyId: string,
  input: ContactPersonInput,
): Promise<ContactPersonRecord | null> {
  const db = getDb();
  const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) return null;

  const [created] = await db
    .insert(contactPersons)
    .values({ companyId, name: input.name, role: input.role, email: input.email })
    .returning();
  return created;
}

// Scoped by companyId + contactId together so a contact can't be mutated
// through the wrong company's URL.
export async function updateContactPerson(
  companyId: string,
  contactId: string,
  input: ContactPersonInput,
): Promise<ContactPersonRecord | null> {
  const db = getDb();
  const [updated] = await db
    .update(contactPersons)
    .set({ name: input.name, role: input.role, email: input.email, updatedAt: new Date() })
    .where(and(eq(contactPersons.id, contactId), eq(contactPersons.companyId, companyId)))
    .returning();
  return updated ?? null;
}

export async function deleteContactPerson(companyId: string, contactId: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(contactPersons)
    .where(and(eq(contactPersons.id, contactId), eq(contactPersons.companyId, companyId)))
    .returning({ id: contactPersons.id });
  return deleted.length > 0;
}
