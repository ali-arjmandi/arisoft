import type { companies, contactPersons, emails } from "@/lib/db/schema";

export type CompanyRecord = typeof companies.$inferSelect;
export type ContactPersonRecord = typeof contactPersons.$inferSelect;
export type EmailRecord = typeof emails.$inferSelect;

export interface CompanyListItem {
  id: string;
  companyName: string;
  kvkNumber: string | null;
  contactCount: number;
  emailCount: number;
  createdAt: Date;
}

export interface CompanyWithDetails {
  company: CompanyRecord;
  contacts: ContactPersonRecord[];
  emails: EmailRecord[];
}

export type QueuedEmailListItem = EmailRecord & { companyName: string };

export interface ContactPersonInput {
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
}
