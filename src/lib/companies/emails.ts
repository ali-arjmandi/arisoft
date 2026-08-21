import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companies, contactPersons, emails } from "@/lib/db/schema";
import type { AllowedSender } from "@/lib/email/senders";
import type { EmailContent } from "@/lib/email/content";
import type { EmailStatus } from "@/lib/email/status";
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
    status: "sent",
    sentAt: new Date(),
  });
}

export interface CreateGeneratedEmailInput {
  companyId: string;
  contactPersonId?: string;
  to: string;
  from: AllowedSender;
  content: EmailContent;
  status: EmailStatus;
}

// Called right after a company's outreach email is generated — either
// automatically by the queue processor (src/lib/companyQueue) right after
// it saves a company, or manually from the company detail page. Never
// inserts as "sent" (that only ever happens via recordEmailSent, after an
// actual SMTP send) — callers pick "draft" or "queued" explicitly.
export async function createGeneratedEmail(input: CreateGeneratedEmailInput): Promise<EmailRecord> {
  const db = getDb();
  let contactPersonId: string | null = null;
  let contactNameSnapshot: string | null = null;

  if (input.contactPersonId) {
    // Looked up fresh (not trusted from the client) so the snapshot reflects
    // the contact's actual name at the moment of generation.
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

  const [created] = await db
    .insert(emails)
    .values({
      companyId: input.companyId,
      contactPersonId,
      contactNameSnapshot,
      contactEmailSnapshot: input.to,
      fromSender: input.from,
      content: input.content,
      status: input.status,
      sentAt: null,
    })
    .returning();
  return created;
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
      status: emails.status,
      createdAt: emails.createdAt,
      sentAt: emails.sentAt,
      companyName: companies.companyName,
    })
    .from(emails)
    .innerJoin(companies, eq(companies.id, emails.companyId))
    .where(eq(emails.status, "queued"))
    .orderBy(asc(emails.createdAt));
}

export async function getQueuedEmailById(id: string): Promise<EmailRecord | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(emails)
    .where(and(eq(emails.id, id), eq(emails.status, "queued")))
    .limit(1);
  return row ?? null;
}

// Flips a queued row to sent in place, rather than inserting a new row like
// recordEmailSent does — a queued row's recipient/content are already
// frozen, so sending it is just marking it sent, not creating a second one.
// Only a queued row can be sent — a draft must be queued first.
export async function markEmailSent(id: string): Promise<EmailRecord | null> {
  const db = getDb();
  const [row] = await db
    .update(emails)
    .set({ status: "sent", sentAt: new Date() })
    .where(and(eq(emails.id, id), eq(emails.status, "queued")))
    .returning();
  return row ?? null;
}

// Promotes a draft to queued — the "Queue" action on the company detail
// page. Only a draft can be queued this way.
export async function queueDraftEmail(id: string): Promise<EmailRecord | null> {
  const db = getDb();
  const [row] = await db
    .update(emails)
    .set({ status: "queued" })
    .where(and(eq(emails.id, id), eq(emails.status, "draft")))
    .returning();
  return row ?? null;
}

// A sent email is permanent history and can't be deleted this way — only a
// draft or a still-queued row can be discarded.
export async function deleteEmail(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(emails)
    .where(and(eq(emails.id, id), inArray(emails.status, ["draft", "queued"])))
    .returning({ id: emails.id });
  return deleted.length > 0;
}
