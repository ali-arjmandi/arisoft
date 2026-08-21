import type { emailSendState } from "@/lib/db/schema";

export type EmailSendStateRecord = typeof emailSendState.$inferSelect;
