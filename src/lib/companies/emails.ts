import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companies, contactPersons, emails } from "@/lib/db/schema";
import type { AllowedSender } from "@/lib/email/senders";
import type { EmailContent } from "@/lib/email/content";
import type { EmailRecord, QueuedEmailListItem } from "./types";

export interface RecordEmailSentInput {
  companyId: string;
  contactPersonId?: string;
  to: string;
  from: AllowedSender;
  content: EmailContent;
}

// Best-effort logging, called after a send has already succeeded. Callers
// must wrap this in try/catch — a logging failure must never turn an
// already-sent email into a user-facing failure.
export async function recordEmailSent(input: RecordEmailSentInput): Promise<void> {
  const db = getDb();
  let contactPersonId: string | null = null;
  let contactNameSnapshot: string | null = null;

  if (input.contactPersonId) {
    // Looked up fresh (not trusted from the client) so the snapshot reflects
    // the contact's actual name at the moment of sending.
    const [contact] = await db
      .select({ id: contactPersons.id, name: contactPersons.name })
      .from(contactPersons)
      .where(eq(contactPersons.id, input.contactPersonId))
      .limit(1);
    if (contact) {
      contactPersonId = contact.id;
      contactNameSnapshot = contact.name;
    }
  }

  await db.insert(emails).values({
    companyId: input.companyId,
    contactPersonId,
    contactNameSnapshot,
    contactEmailSnapshot: input.to,
    fromSender: input.from,
    content: input.content,
    sentAt: new Date(),
  });
}

export interface QueueGeneratedEmailInput {
  companyId: string;
  to: string;
  from: AllowedSender;
  content: EmailContent;
}

// Called right after the queue processor (src/lib/companyQueue) saves a
// company and generates its outreach email. Inserts with sentAt: null so
// the row shows up as "queued" everywhere emails are listed, until an admin
// sends or discards it from the Email queue page.
export async function queueGeneratedEmail(input: QueueGeneratedEmailInput): Promise<void> {
  const db = getDb();
  await db.insert(emails).values({
    companyId: input.companyId,
    contactPersonId: null,
    contactNameSnapshot: null,
    contactEmailSnapshot: input.to,
    fromSender: input.from,
    content: input.content,
    sentAt: null,
  });
}

export async function listQueuedEmails(): Promise<QueuedEmailListItem[]> {
  const db = getDb();
  return db
    .select({
      id: emails.id,
      companyId: emails.companyId,
      contactPersonId: emails.contactPersonId,
      contactNameSnapshot: emails.contactNameSnapshot,
      contactEmailSnapshot: emails.contactEmailSnapshot,
      fromSender: emails.fromSender,
      content: emails.content,
      createdAt: emails.createdAt,
      sentAt: emails.sentAt,
      companyName: companies.companyName,
    })
    .from(emails)
    .innerJoin(companies, eq(companies.id, emails.companyId))
    .where(isNull(emails.sentAt))
    .orderBy(asc(emails.createdAt));
}

export async function getQueuedEmailById(id: string): Promise<EmailRecord | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(emails)
    .where(and(eq(emails.id, id), isNull(emails.sentAt)))
    .limit(1);
  return row ?? null;
}

// Flips a queued row to sent in place, rather than inserting a new row like
// recordEmailSent does — a queued row's recipient/content are already
// frozen, so sending it is just marking it sent, not creating a second one.
export async function markEmailSent(id: string): Promise<EmailRecord | null> {
  const db = getDb();
  const [row] = await db
    .update(emails)
    .set({ sentAt: new Date() })
    .where(and(eq(emails.id, id), isNull(emails.sentAt)))
    .returning();
  return row ?? null;
}

export async function deleteQueuedEmail(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(emails)
    .where(and(eq(emails.id, id), isNull(emails.sentAt)))
    .returning({ id: emails.id });
  return deleted.length > 0;
}
