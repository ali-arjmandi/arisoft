import type { GeneratedEmailContent } from "@/lib/email/emailContentSchema";

export const EMAIL_PREFILL_STORAGE_KEY = "arisoft-panel-email-prefill";

export type EmailHandoffMessage =
  | { status: "success"; content: GeneratedEmailContent }
  | { status: "error"; message: string };
