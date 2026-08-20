import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import type { EmailContent } from "@/lib/email/content";
import type { AllowedSender } from "@/lib/email/senders";

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
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("contact_persons_company_id_idx").on(table.companyId)],
);

// Historical log of sent emails. company_id cascades (deleting a company
// deletes its send history), but contact_person_id is set null on contact
// delete/edit — the snapshot columns are what keep the row meaningful and
// accurate after that, since this table must never change retroactively.
export const emailsSent = pgTable(
  "emails_sent",
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
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("emails_sent_company_id_idx").on(table.companyId),
    index("emails_sent_contact_person_id_idx").on(table.contactPersonId),
  ],
);
