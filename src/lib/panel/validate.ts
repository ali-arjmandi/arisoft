import { ALLOWED_SENDERS, type AllowedSender } from "@/lib/email/senders";
import { CONTENT_FIELDS, type ContentFieldName, type EmailContent } from "@/lib/email/content";

const OPTIONAL_FIELDS: readonly ContentFieldName[] = ["unsubscribeUrl", "ctaLabel", "ctaUrl"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL_PATTERN.test(value.trim());
}

export function isAllowedSender(value: unknown): value is AllowedSender {
  return typeof value === "string" && (ALLOWED_SENDERS as readonly string[]).includes(value);
}

export interface ParsedSendRequest {
  to: string;
  from: AllowedSender;
  content: EmailContent;
}

export type ParseResult = { ok: true; data: ParsedSendRequest } | { ok: false; errors: string[] };

export function parseSendRequest(body: unknown): ParseResult {
  const errors: string[] = [];

  if (typeof body !== "object" || body === null) {
    return { ok: false, errors: ["Request body must be an object."] };
  }
  const record = body as Record<string, unknown>;

  const to = typeof record.to === "string" ? record.to.trim() : "";
  if (!isValidEmail(to)) errors.push("A valid recipient email is required.");

  const from = record.from;
  if (!isAllowedSender(from)) {
    errors.push(`Sender must be one of: ${ALLOWED_SENDERS.join(", ")}.`);
  }

  const contentInput = record.content;
  const content = {} as EmailContent;
  if (typeof contentInput !== "object" || contentInput === null) {
    errors.push("Email content is required.");
  } else {
    const contentRecord = contentInput as Record<string, unknown>;
    for (const field of CONTENT_FIELDS) {
      const raw = contentRecord[field];
      const value = typeof raw === "string" ? raw.trim() : "";
      if (!value && !OPTIONAL_FIELDS.includes(field)) {
        errors.push(`Field "${field}" is required.`);
      }
      content[field] = value;
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, data: { to, from: from as AllowedSender, content } };
}
