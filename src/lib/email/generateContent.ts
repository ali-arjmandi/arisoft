import OpenAI from "openai";
import type { EmailContent } from "@/lib/email/content";

export type GeneratedFieldName = "subject" | "preheader" | "heading" | "body";
export type GeneratedEmailContent = Pick<EmailContent, GeneratedFieldName>;

const GENERATED_FIELDS: GeneratedFieldName[] = ["subject", "preheader", "heading", "body"];

const SYSTEM_PROMPT = `You write marketing emails for Arisoft, a company that builds AI automation for small and medium businesses. The audience is busy business owners and operations leads who are practical and skeptical of hype.

You will receive a brief describing what one email should say. Generate the email content it describes.

Tone:
Write like a helpful person explaining something to a colleague, not like a brochure. Plain, everyday words. Short sentences. Active voice. Avoid overused AI marketing phrases such as "unlock," "elevate," "seamless," "game-changer," "in today's fast-paced world," "revolutionize," "dive into," "leverage," "supercharge," and "cutting-edge." Do not use the em dash character (—); use a period, comma, or a connecting word instead.

Fields:
- subject: the email subject line, about 40-60 characters, specific rather than clickbait.
- preheader: inbox preview text, about 50-100 characters, adds a detail the subject didn't cover.
- heading: the main headline, one short sentence or phrase, states the point directly.
- body: 2-4 short paragraphs as plain HTML. Only use <p>, <strong>, <em>, and <a href="..."> tags — no markdown, no headings, no lists. Example shape (illustrate structure only, not content): <p>Opening line.</p><p>Supporting detail, with <strong>one</strong> emphasized phrase if it helps.</p>

Base every field on the brief below. Where the brief leaves something unspecified, make a reasonable choice that stays consistent with the rest of the email.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    preheader: { type: "string" },
    heading: { type: "string" },
    body: { type: "string" },
  },
  required: GENERATED_FIELDS,
  additionalProperties: false,
} as const;

function sanitize(value: string): string {
  return value.trim().replace(/\s*—\s*/g, ", ");
}

export async function generateEmailContent(brief: string): Promise<GeneratedEmailContent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: 2048,
    response_format: {
      type: "json_schema",
      json_schema: { name: "email_content", strict: true, schema: OUTPUT_SCHEMA },
    },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `<brief>\n${brief}\n</brief>` },
    ],
  });

  const message = response.choices[0]?.message;

  if (message?.refusal) {
    throw new Error("The AI declined to generate this content. Try rephrasing the brief.");
  }

  if (!message?.content) {
    throw new Error("The AI did not return any content.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(message.content);
  } catch {
    throw new Error("The AI returned content in an unexpected format.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("The AI returned content in an unexpected format.");
  }

  const record = parsed as Record<string, unknown>;
  const result = {} as GeneratedEmailContent;
  for (const field of GENERATED_FIELDS) {
    const value = record[field];
    if (typeof value !== "string") {
      throw new Error("The AI returned content in an unexpected format.");
    }
    result[field] = sanitize(value);
  }

  return result;
}
