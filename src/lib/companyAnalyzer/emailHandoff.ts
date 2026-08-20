import type { GeneratedEmailContent } from "@/lib/email/emailContentSchema";

export const EMAIL_PREFILL_STORAGE_KEY = "arisoft-dashboard-email-prefill";

export type EmailHandoffMessage =
  | { status: "success"; content: GeneratedEmailContent; to?: string; companyId?: string; contactPersonId?: string }
  | { status: "prefill"; to: string; companyId: string; contactPersonId: string }
  | { status: "error"; message: string };
