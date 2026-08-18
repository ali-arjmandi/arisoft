import type { EmailContent } from "@/lib/email/content";

export type GeneratedFieldName = "subject" | "preheader" | "heading" | "body";
export type GeneratedEmailContent = Pick<EmailContent, GeneratedFieldName>;

export const GENERATED_EMAIL_FIELDS: GeneratedFieldName[] = ["subject", "preheader", "heading", "body"];

export const GENERATED_EMAIL_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    preheader: { type: "string" },
    heading: { type: "string" },
    body: { type: "string" },
  },
  required: GENERATED_EMAIL_FIELDS,
  additionalProperties: false,
} as const;

const FORMAT_ERROR = "The AI returned content in an unexpected format.";

export function sanitizeGeneratedText(value: string): string {
  return value.trim().replace(/\s*—\s*/g, ", ");
}

export function pickValidGeneratedFields(value: unknown): Partial<GeneratedEmailContent> {
  if (typeof value !== "object" || value === null) return {};
  const record = value as Record<string, unknown>;
  const result: Partial<GeneratedEmailContent> = {};
  for (const field of GENERATED_EMAIL_FIELDS) {
    const fieldValue = record[field];
    if (typeof fieldValue === "string") {
      result[field] = fieldValue;
    }
  }
  return result;
}

export function parseGeneratedEmailContent(rawJsonText: string): GeneratedEmailContent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    throw new Error(FORMAT_ERROR);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(FORMAT_ERROR);
  }

  const record = parsed as Record<string, unknown>;
  const result = {} as GeneratedEmailContent;
  for (const field of GENERATED_EMAIL_FIELDS) {
    const value = record[field];
    if (typeof value !== "string") {
      throw new Error(FORMAT_ERROR);
    }
    result[field] = sanitizeGeneratedText(value);
  }

  return result;
}
