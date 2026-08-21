import { pgTable, uuid, text, timestamp, jsonb, index, boolean, smallint } from "drizzle-orm/pg-core";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import type { EmailContent } from "@/lib/email/content";
import type { AllowedSender } from "@/lib/email/senders";
import type { QueueItemStatus } from "@/lib/companyQueue/status";

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

// Log of both sent and queued-but-not-yet-sent emails. company_id cascades
// (deleting a company deletes its email history), but contact_person_id is
// set null on contact delete/edit — the snapshot columns are what keep the
// row meaningful and accurate after that, since a row must never change
// retroactively once written. sent_at is null while the row is queued (see
// src/lib/companyQueue) and set once the email actually goes out; created_at
// is the reliable ordering key regardless of send status.
export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    contactPersonId: uuid("contact_person_id").references(() => contactPersons.id, { onDelete: "set null" }),
    contactNameSnapshot: text("contact_name_snapshot"),
    contactEmailSnapshot: text("contact_email_snapshot").notNull(),
    fromSender: text("from_sender").$type<AllowedSender>().notNull(),
    content: jsonb("content").$type<EmailContent>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
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
// allowed to claim and process work, and whether processing should also
// generate + queue an outreach email for each company. Read/written via
// getQueueState() / setQueueRunning() / setGenerateEmails() in
// src/lib/companyQueue/state.ts, which lazily create this row if missing
// rather than relying on a seed migration (this repo has no seed-data
// system).
export const queueState = pgTable("queue_state", {
  id: smallint("id").primaryKey().default(1),
  isRunning: boolean("is_running").notNull().default(false),
  generateEmails: boolean("generate_emails").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
