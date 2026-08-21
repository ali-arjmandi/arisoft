import { and, asc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companies, contactPersons, emails } from "@/lib/db/schema";
import type { AllowedSender } from "@/lib/email/senders";
import type { EmailContent } from "@/lib/email/content";
import type { EmailStatus } from "@/lib/email/status";
import type { EmailRecord, QueuedEmailListItem } from "./types";

export interface RecordEmailSentInput {
  companyId: string | null;
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
  companyId: string | null;
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
      sendAttemptedAt: emails.sendAttemptedAt,
      sendError: emails.sendError,
      companyName: companies.companyName,
    })
    .from(emails)
    // Left join: a queued email may have no company FK at all (see
    // resolveEmailCompanyLink), and must still show up here.
    .leftJoin(companies, eq(companies.id, emails.companyId))
    .where(eq(emails.status, "queued"))
    .orderBy(asc(emails.createdAt));
}

export async function getEmailById(id: string): Promise<EmailRecord | null> {
  const db = getDb();
  const [row] = await db.select().from(emails).where(eq(emails.id, id)).limit(1);
  return row ?? null;
}

export interface CompanyEmailMatch {
  companyId: string;
  contactPersonId?: string;
}

// Reverse lookup used only when composing a brand-new email with no known
// company context (never when a companyId is already known — see
// resolveEmailCompanyLink below). Tries an exact case-insensitive match
// against a contact person's email first, then the company's researched
// general email; returns null (no forced FK) if neither matches.
export async function findCompanyForEmail(email: string): Promise<CompanyEmailMatch | null> {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const [contactMatch] = await db
    .select({ companyId: contactPersons.companyId, contactPersonId: contactPersons.id })
    .from(contactPersons)
    .where(sql`lower(${contactPersons.email}) = ${normalized}`)
    .limit(1);
  if (contactMatch) return contactMatch;

  const [companyMatch] = await db
    .select({ companyId: companies.id })
    .from(companies)
    .where(sql`lower(${companies.analysis}->'contact'->>'generalEmail') = ${normalized}`)
    .limit(1);
  return companyMatch ?? null;
}

// Central FK-resolution rule: if the caller already knows the companyId
// (editing/queuing a company's template, or the existing "send email to
// this contact" flow), trust it as-is — a manually-typed receiver must
// never override it. Only run the reverse lookup when composing completely
// from scratch with no known company; if nothing matches, the email is
// intentionally left with no company FK rather than forcing one.
export async function resolveEmailCompanyLink(
  explicitCompanyId: string | undefined,
  explicitContactPersonId: string | undefined,
  to: string,
): Promise<{ companyId: string | null; contactPersonId: string | undefined }> {
  if (explicitCompanyId) {
    return { companyId: explicitCompanyId, contactPersonId: explicitContactPersonId };
  }
  const match = await findCompanyForEmail(to);
  return match
    ? { companyId: match.companyId, contactPersonId: match.contactPersonId }
    : { companyId: null, contactPersonId: undefined };
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

// Read-only peek at the row the paced auto-publish tick would claim next,
// without claiming it — used to check that sender's pacing/caps *before*
// claiming, so a row that's simply not due yet under the pace isn't
// mistaken for a claimed-but-failed attempt (see claimNextQueuedEmailForSend
// below). Same eligibility rule as the claim query: still queued, and
// either never auto-attempted or last attempted before the retry cooldown.
export async function peekNextQueuedEmailForSend(cooldownMinutes: number): Promise<EmailRecord | null> {
  const db = getDb();
  const cooldownThreshold = new Date(Date.now() - cooldownMinutes * 60_000);
  const [row] = await db
    .select()
    .from(emails)
    .where(
      and(
        eq(emails.status, "queued"),
        or(isNull(emails.sendAttemptedAt), lt(emails.sendAttemptedAt, cooldownThreshold)),
      ),
    )
    .orderBy(asc(emails.createdAt))
    .limit(1);
  return row ?? null;
}

// Atomically claims the next eligible row for the auto-publish tick: FOR
// UPDATE SKIP LOCKED so an overlapping tick (a manual cron ping racing the
// scheduled one) skips a row another tick already claimed, same pattern as
// claimNextBatch() in companyQueue/queue.ts. Claiming just stamps
// sendAttemptedAt = now() rather than flipping status (emails has no
// "sending" status) — the actual SMTP send happens after this returns, kept
// out of the transaction so a slow network call never holds the row lock.
export async function claimNextQueuedEmailForSend(cooldownMinutes: number): Promise<EmailRecord | null> {
  const db = getDb();
  const cooldownThreshold = new Date(Date.now() - cooldownMinutes * 60_000);

  return db.transaction(async (tx) => {
    const [eligible] = await tx
      .select({ id: emails.id })
      .from(emails)
      .where(
        and(
          eq(emails.status, "queued"),
          or(isNull(emails.sendAttemptedAt), lt(emails.sendAttemptedAt, cooldownThreshold)),
        ),
      )
      .orderBy(asc(emails.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!eligible) return null;

    const [claimed] = await tx
      .update(emails)
      .set({ sendAttemptedAt: new Date() })
      .where(eq(emails.id, eligible.id))
      .returning();
    return claimed ?? null;
  });
}

// Records why a claimed row's auto-publish attempt failed. status stays
// "queued" — sendAttemptedAt (set by the claim above) is what gates the
// next auto-retry, while the row remains sendable immediately via the
// manual "Send" button regardless of that cooldown.
export async function markEmailSendFailed(id: string, error: string): Promise<void> {
  const db = getDb();
  await db.update(emails).set({ sendError: error }).where(eq(emails.id, id));
}

export interface EmailSendStats {
  lastSentAt: Date | null;
  sentLastHour: number;
  sentLastDay: number;
}

// Rate-limit inputs for the auto-publish tick, computed straight from the
// emails table (no separate counters to keep in sync). Scoped per sender —
// ALLOWED_SENDERS[0] gets essentially all auto-generated volume today, but
// the cap must not silently apply across both mailboxes combined.
export async function getEmailSendStats(from: AllowedSender): Promise<EmailSendStats> {
  const db = getDb();
  const hourAgo = new Date(Date.now() - 60 * 60_000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);

  const [row] = await db
    .select({
      lastSentAt: sql<Date | null>`max(${emails.sentAt})`,
      sentLastHour: sql<number>`count(*) filter (where ${emails.sentAt} >= ${hourAgo})::int`,
      sentLastDay: sql<number>`count(*) filter (where ${emails.sentAt} >= ${dayAgo})::int`,
    })
    .from(emails)
    .where(and(eq(emails.status, "sent"), eq(emails.fromSender, from), gte(emails.sentAt, dayAgo)));

  return row ?? { lastSentAt: null, sentLastHour: 0, sentLastDay: 0 };
}
