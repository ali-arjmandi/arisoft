import type { companies, contactPersons, emailsSent } from "@/lib/db/schema";

export type CompanyRecord = typeof companies.$inferSelect;
export type ContactPersonRecord = typeof contactPersons.$inferSelect;
export type EmailSentRecord = typeof emailsSent.$inferSelect;

export interface CompanyListItem {
  id: string;
  companyName: string;
  kvkNumber: string | null;
  emailCount: number;
  createdAt: Date;
}

export interface CompanyWithDetails {
  company: CompanyRecord;
  contacts: ContactPersonRecord[];
  emailsSent: EmailSentRecord[];
}

export interface ContactPersonInput {
  name: string;
  role: string | null;
  email: string;
}
