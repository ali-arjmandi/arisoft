import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  boolean,
  smallint,
  integer,
  numeric,
  primaryKey,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import type { EmailContent } from "@/lib/email/content";
import type { AllowedSender } from "@/lib/email/senders";
import type { GenerateEmailsMode, QueueItemStatus } from "@/lib/companyQueue/status";
import type { EmailStatus } from "@/lib/email/status";
import type { ReportEventType } from "@/lib/reports/reportEventType";
import type { SellerInfo } from "@/lib/invoice/seller";
import type { InvoiceEmailStatus, InvoiceKind, StoredBuyer, StoredLine, StoredPayment, VatMode } from "@/lib/invoice/types";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Denormalized from analysis.companyName / analysis.kvkNumber, kept in
  // sync by src/lib/companies/companies.ts on every write so the list view
  // can read/sort them without unpacking the JSONB blob.
  companyName: text("company_name").notNull(),
  kvkNumber: text("kvk_number"),
  analysis: jsonb("analysis").$type<CompanyAnalysis>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactPersons = pgTable(
  "contact_persons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    email: text("email"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("contact_persons_company_id_idx").on(table.companyId)],
);

// Log of draft, queued, and sent emails. company_id cascades (deleting a
// company deletes its email history), but contact_person_id is set null on
// contact delete/edit — the snapshot columns are what keep the row
// meaningful and accurate after that, since a row must never change
// retroactively once written. status is the source of truth for where a
// row is in its lifecycle (draft -> queued -> sent, see src/lib/email/status
// and src/lib/companyQueue); sent_at is just the actual send timestamp, set
// only when status becomes "sent" — it is not used to infer status anymore.
// created_at is the reliable ordering key regardless of status.
export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable: a manually-composed email with no known/matched company
    // context is still logged, just with no company FK (see
    // resolveEmailCompanyLink in src/lib/companies/emails.ts).
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    contactPersonId: uuid("contact_person_id").references(() => contactPersons.id, { onDelete: "set null" }),
    contactNameSnapshot: text("contact_name_snapshot"),
    contactEmailSnapshot: text("contact_email_snapshot").notNull(),
    fromSender: text("from_sender").$type<AllowedSender>().notNull(),
    content: jsonb("content").$type<EmailContent>().notNull(),
    status: text("status").$type<EmailStatus>().notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    // Set by the paced auto-publish tick (src/lib/email/publishTick.ts) each
    // time it claims this row to attempt a send, whether that attempt then
    // succeeds or fails. Doubles as both the claim marker (a second
    // concurrent tick skips a row claimed moments ago) and the auto-retry
    // cooldown gate (a row that failed isn't retried again until the
    // cooldown elapses) — status stays "queued" either way, so a human can
    // still hit the manual "Send" button immediately regardless of cooldown.
    sendAttemptedAt: timestamp("send_attempted_at", { withTimezone: true }),
    // Error from the most recent auto-publish attempt, if it failed. Cleared
    // implicitly by becoming irrelevant once status flips to "sent"; not
    // read anywhere once that happens.
    sendError: text("send_error"),
  },
  (table) => [
    index("emails_company_id_idx").on(table.companyId),
    index("emails_contact_person_id_idx").on(table.contactPersonId),
  ],
);

// Queue of companies to run through analyzeCompany -> saveCompanyAnalysis ->
// generateOutreachEmail automatically. company_id is set once processing
// succeeds; onDelete "set null" keeps the queue's historical record even if
// the resulting company is later deleted.
export const companyQueueItems = pgTable(
  "company_queue_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: text("company_name").notNull(),
    kvkNumber: text("kvk_number"),
    status: text("status").$type<QueueItemStatus>().notNull().default("waiting"),
    errorMessage: text("error_message"),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("company_queue_items_status_created_at_idx").on(table.status, table.createdAt),
    index("company_queue_items_company_id_idx").on(table.companyId),
  ],
);

// Singleton row (id always 1) controlling whether the queue processor is
// allowed to claim and process work, and whether/how processing should also
// generate an outreach email for each company (off, as a draft, or straight
// to queued). Read/written via getQueueState() / setQueueRunning() /
// setGenerateEmailsMode() in src/lib/companyQueue/state.ts, which lazily
// create this row if missing rather than relying on a seed migration (this
// repo has no seed-data system).
export const queueState = pgTable("queue_state", {
  id: smallint("id").primaryKey().default(1),
  isRunning: boolean("is_running").notNull().default(false),
  generateEmailsMode: text("generate_emails_mode").$type<GenerateEmailsMode>().notNull().default("queued"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // Set for the duration of one runQueueTick() call (src/lib/companyQueue/
  // processing.ts), so an overlapping cron-triggered invocation — Amplify
  // SSR runs as multiple concurrent Lambda instances, and an external
  // scheduler doesn't wait for the previous call to finish before firing
  // the next — sees it's already held and no-ops instead of claiming and
  // processing its own extra QUEUE_BATCH_SIZE batch on top. Cleared when
  // the tick finishes; treated as stale (reclaimable) past
  // TICK_LOCK_STALE_MINUTES in case a Lambda is killed mid-tick without
  // reaching its `finally`.
  lockedAt: timestamp("locked_at", { withTimezone: true }),
});

// Singleton row (id always 1), same shape and lazy-create pattern as
// queueState above, controlling whether the paced auto-publish tick
// (src/lib/email/publishTick.ts) is allowed to claim and send queued
// emails. A separate table from queueState because it's a different job
// (sending already-generated emails vs. analyzing companies) with its own
// independent Start/Stop control on the Email queue page.
export const emailSendState = pgTable("email_send_state", {
  id: smallint("id").primaryKey().default(1),
  isRunning: boolean("is_running").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // Same overlapping-tick lock as queueState.lockedAt above, held for the
  // duration of one runEmailSendTick() call. Matters here even more than
  // for the company queue: two overlapping ticks would each independently
  // see "enough time has passed since the last send" and each send an
  // email, defeating the whole point of the pacing.
  lockedAt: timestamp("locked_at", { withTimezone: true }),
});

// The unguessable bearer token for a company's public shareable report link
// (src/app/report/[token]). Deliberately a separate random token rather than
// the company's own id — decouples the internal record id (visible
// throughout the dashboard) from the external bearer credential, and leaves
// room to rotate/revoke a link later without touching the company row.
// Lazily created on first "Copy report link" click, one per company.
export const companyReportLinks = pgTable("company_report_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" })
    .unique(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only log of public report engagement (page opens, PDF downloads),
// recorded via the public /api/report/[token]/track route. Aggregated per
// company for the "Report" card on the company detail page — see
// getReportEngagement in src/lib/reports/reportEvents.ts.
export const reportEvents = pgTable(
  "report_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    type: text("type").$type<ReportEventType>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("report_events_company_id_idx").on(table.companyId),
    index("report_events_company_id_type_idx").on(table.companyId, table.type),
  ],
);

// A mirror of the ALLOWED_SENDERS Gmail mailboxes, imported over IMAP by
// src/lib/email/inbox.ts: received mail and the mailbox's own sent mail, so a
// conversation can be shown whole. Rows are re-importable, Gmail stays the
// source of truth. uid is the message's IMAP UID in that mailbox's All Mail
// folder. Only plain text is kept: mail HTML is untrusted and is never stored
// or rendered.
export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mailbox: text("mailbox").$type<AllowedSender>().notNull(),
    uid: integer("uid").notNull(),
    // Gmail's own conversation id (X-GM-THRID).
    threadId: text("thread_id").notNull(),
    // Null on the rare message without a Message-ID header; a reply to one
    // still sends, it just can't be threaded.
    messageId: text("message_id"),
    references: jsonb("references").$type<string[]>().notNull().default([]),
    fromName: text("from_name"),
    fromAddress: text("from_address"),
    replyToAddress: text("reply_to_address"),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("inbox_messages_mailbox_uid_idx").on(table.mailbox, table.uid),
    index("inbox_messages_mailbox_thread_id_idx").on(table.mailbox, table.threadId),
  ],
);

// Issued invoices and credit notes (src/lib/invoice/store.ts). Rows are never
// updated: the buyer, seller, lines, rate and VAT mode are copies taken at
// issue, so a PDF made years later needs nothing that can change. Everything
// that does change lives in invoice_emails. vat_year is the Amsterdam calendar
// year of the sale, which can differ from the year in the number when HSM
// retries across New Year.
export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    series: text("series").notNull(),
    number: text("number").notNull().unique(),
    kind: text("kind").$type<InvoiceKind>().notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    creditsInvoiceId: text("credits_invoice_id").references((): AnyPgColumn => invoices.id),
    creditsNumber: text("credits_number"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    vatYear: integer("vat_year").notNull(),
    // numeric, not integer: Finland's rate is 25.5.
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull(),
    vatMode: text("vat_mode").$type<VatMode>().notNull(),
    // A sale to an EU buyer outside the Netherlands: counts toward the OSS threshold.
    euCrossBorder: boolean("eu_cross_border").notNull(),
    amountExclVatCents: integer("amount_excl_vat_cents").notNull(),
    vatCents: integer("vat_cents").notNull(),
    amountInclVatCents: integer("amount_incl_vat_cents").notNull(),
    buyer: jsonb("buyer").$type<StoredBuyer>().notNull(),
    seller: jsonb("seller").$type<SellerInfo>().notNull(),
    lines: jsonb("lines").$type<StoredLine[]>().notNull(),
    payment: jsonb("payment").$type<StoredPayment>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("invoices_threshold_idx").on(table.vatYear, table.euCrossBorder)],
);

export const invoiceCounters = pgTable(
  "invoice_counters",
  {
    series: text("series").notNull(),
    year: integer("year").notNull(),
    lastNumber: integer("last_number").notNull(),
  },
  (table) => [primaryKey({ columns: [table.series, table.year] })],
);

// One row per invoice that should be emailed; /api/cron/tick works through it.
export const invoiceEmails = pgTable(
  "invoice_emails",
  {
    invoiceId: text("invoice_id")
      .primaryKey()
      .references(() => invoices.id),
    status: text("status").$type<InvoiceEmailStatus>().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextTryAt: timestamp("next_try_at", { withTimezone: true }).notNull().defaultNow(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [index("invoice_emails_status_next_try_idx").on(table.status, table.nextTryAt)],
);

// The €8,000 and €10,000 warnings to the owner, at most one per level and year.
// scope keeps TEST invoices from ever warning about the real total.
export const vatAlerts = pgTable(
  "vat_alerts",
  {
    scope: text("scope").$type<"live" | "test">().notNull(),
    year: integer("year").notNull(),
    levelCents: integer("level_cents").notNull(),
    invoiceNumber: text("invoice_number").notNull(),
    totalCents: integer("total_cents").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.scope, table.year, table.levelCents] })],
);
