import { and, asc, desc, eq } from "drizzle-orm";
import { convert } from "html-to-text";
import { ImapFlow, type FetchMessageObject } from "imapflow";
import { simpleParser } from "mailparser";
import { getDb } from "@/lib/db/client";
import { inboxMessages } from "@/lib/db/schema";
import { groupInboxThreads, type InboxThread } from "./inboxThreads";
import { getMailboxPassword } from "./sendEmail";
import { ALLOWED_SENDERS, type AllowedSender } from "./senders";

// Each chunk is saved before the next is fetched, and the budget keeps one
// sync well under Amplify's ~30s request limit, so a slow run still makes
// progress instead of losing everything to a 504.
const SYNC_CHUNK_SIZE = 10;
const SYNC_BUDGET_MS = 15_000;
const IMAP_CONNECT_TIMEOUT_MS = 8_000;
// Text parts come first in practice, so a large attachment is cut off here
// instead of being loaded into a Lambda's memory.
const MAX_SOURCE_BYTES = 2_000_000;

export type InboxMessage = typeof inboxMessages.$inferSelect;

// Postgres text columns reject NUL bytes, which can occur in decoded mail.
function clean(value: string): string {
  return value.replace(/\0/g, "");
}

// Many mails are HTML-only, and only plain text is ever stored or shown.
function htmlToText(html: string): string {
  return convert(html, { wordwrap: false, selectors: [{ selector: "img", format: "skip" }] });
}

// A message that fails to parse is still stored, otherwise every sync would
// retry it and it would fill the batch forever.
export async function toInboxRow(mailbox: AllowedSender, message: FetchMessageObject) {
  const parsed = message.source ? await simpleParser(message.source).catch(() => null) : null;
  const from = parsed?.from?.value[0];
  const replyTo = Array.isArray(parsed?.replyTo) ? undefined : parsed?.replyTo?.value[0];
  return {
    mailbox,
    uid: message.uid,
    threadId: message.threadId ?? String(message.uid),
    messageId: parsed?.messageId ?? null,
    references: [parsed?.references ?? []].flat(),
    fromName: from?.name ? clean(from.name) : null,
    fromAddress: from?.address ?? null,
    replyToAddress: replyTo?.address ?? null,
    subject: clean(parsed?.subject ?? "(no subject)"),
    bodyText: clean(parsed?.text || (parsed?.html ? htmlToText(parsed.html) : "")),
    receivedAt: new Date(message.internalDate ?? parsed?.date ?? Date.now()),
  };
}

// Imports whatever All Mail has that the table doesn't, newest first, so new
// mail never waits behind a history import. All Mail rather than INBOX so
// archived conversations and sent mail are included. Compared as a set rather
// than a max(uid) cursor so a message Gmail exposes late is never skipped.
// shortcut: assumes Gmail's UIDVALIDITY never changes, re-import by emptying the table if it does.
async function syncMailbox(mailbox: AllowedSender): Promise<number> {
  const db = getDb();
  const stored = await db
    .select({ uid: inboxMessages.uid })
    .from(inboxMessages)
    .where(eq(inboxMessages.mailbox, mailbox));
  const known = new Set(stored.map((row) => row.uid));
  const deadline = Date.now() + SYNC_BUDGET_MS;

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: mailbox, pass: getMailboxPassword(mailbox) },
    logger: false,
    connectionTimeout: IMAP_CONNECT_TIMEOUT_MS,
    greetingTimeout: IMAP_CONNECT_TIMEOUT_MS,
  });
  await client.connect();
  try {
    const folders = await client.list();
    const path = folders.find((folder) => folder.specialUse === "\\All")?.path ?? "INBOX";
    // Read-only so importing can never mark a message as read in Gmail.
    const lock = await client.getMailboxLock(path, { readOnly: true });
    try {
      const found = await client.search({ draft: false }, { uid: true });
      const uids = (found || []).filter((uid) => !known.has(uid)).sort((a, b) => b - a);

      let imported = 0;
      for (let i = 0; i < uids.length && Date.now() < deadline; i += SYNC_CHUNK_SIZE) {
        const messages = await client.fetchAll(
          uids.slice(i, i + SYNC_CHUNK_SIZE).join(","),
          { uid: true, threadId: true, internalDate: true, source: { maxLength: MAX_SOURCE_BYTES } },
          { uid: true },
        );
        const rows = await Promise.all(messages.map((message) => toInboxRow(mailbox, message)));
        if (rows.length === 0) continue;
        // An overlapping sync imports the same chunk; the unique index absorbs it.
        await db.insert(inboxMessages).values(rows).onConflictDoNothing();
        imported += rows.length;
      }
      return imported;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

// Never throws: this shares /api/cron/tick with the send and company ticks,
// and one mailbox failing must not stop them or the other mailbox.
export async function runInboxSyncTick(): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;
  // Parallel so a large backlog in one mailbox can't use up the other's time.
  await Promise.all(
    ALLOWED_SENDERS.map(async (mailbox) => {
      try {
        const count = await syncMailbox(mailbox);
        imported += count;
      } catch (error) {
        failed += 1;
        console.error(`inbox sync failed for ${mailbox}:`, error);
      }
    }),
  );
  return { imported, failed };
}

// Loads every message's metadata, then groups: threads are paginated in the
// browser (docs/rules.md), and each one needs its latest message anyway.
export async function listInboxThreads(): Promise<InboxThread[]> {
  const rows = await getDb()
    .select({
      id: inboxMessages.id,
      mailbox: inboxMessages.mailbox,
      threadId: inboxMessages.threadId,
      fromName: inboxMessages.fromName,
      fromAddress: inboxMessages.fromAddress,
      subject: inboxMessages.subject,
      receivedAt: inboxMessages.receivedAt,
    })
    .from(inboxMessages)
    .orderBy(desc(inboxMessages.receivedAt));
  return groupInboxThreads(rows);
}

export async function getInboxMessage(id: string): Promise<InboxMessage | null> {
  const [row] = await getDb().select().from(inboxMessages).where(eq(inboxMessages.id, id)).limit(1);
  return row ?? null;
}

// Oldest first. Empty when no message has this id.
export async function getInboxThread(id: string): Promise<InboxMessage[]> {
  const message = await getInboxMessage(id);
  if (!message) return [];
  return getDb()
    .select()
    .from(inboxMessages)
    .where(and(eq(inboxMessages.mailbox, message.mailbox), eq(inboxMessages.threadId, message.threadId)))
    .orderBy(asc(inboxMessages.receivedAt));
}
