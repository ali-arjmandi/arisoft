import type { EmailContent } from "./content";

// "{" is escaped too: renderEmail rejects any leftover {{TOKEN}}, and quoted
// mail can contain one (e.g. an unfilled {{FIRST_NAME}} from a mail merge).
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\{/g, "&#123;");
}

function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, "<br>");
}

export function replySubject(subject: string): string {
  return /^\s*re:/i.test(subject) ? subject : `Re: ${subject}`;
}

export function replyReferences(references: string[], messageId: string | null): string[] {
  return messageId ? [...references, messageId] : references;
}

// Fills the branded template (render.ts). Every inbound value is escaped
// here because the template inserts these fields as raw HTML.
export function buildReplyContent(input: {
  subject: string;
  body: string;
  quotedFrom: string;
  quotedDate: Date;
  quotedText: string;
}): EmailContent {
  const quote = `On ${input.quotedDate.toUTCString()}, ${input.quotedFrom} wrote:`;
  return {
    subject: replySubject(input.subject),
    preheader: escapeHtml(input.body.slice(0, 120)),
    eyebrow: "Reply",
    heading: escapeHtml(input.subject),
    body: `${textToHtml(input.body)}
<p style="margin:24px 0 8px;font-size:13px;color:#666666;">${escapeHtml(quote)}</p>
<blockquote style="margin:0;padding-left:12px;border-left:2px solid #cccccc;font-size:13px;color:#555555;">${textToHtml(input.quotedText)}</blockquote>`,
    ctaLabel: "",
    ctaUrl: "",
    unsubscribeUrl: "",
  };
}
