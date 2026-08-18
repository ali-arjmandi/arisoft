import fs from "fs";
import path from "path";
import type { EmailContent } from "./content";

const TEMPLATE_PATH = path.join(process.cwd(), "src", "lib", "email", "template.html");

export function renderEmail(content: EmailContent): string {
  const year = new Date().getFullYear().toString();

  const unsubscribeBlock = content.unsubscribeUrl
    ? `<a href="${content.unsubscribeUrl}" style="color:#999999;text-decoration:underline;">Unsubscribe</a>&nbsp;&middot;&nbsp;`
    : "";

  const tokenMap: Record<string, string> = {
    "{{PREHEADER}}": content.preheader,
    "{{EYEBROW}}": content.eyebrow,
    "{{HEADING}}": content.heading,
    "{{BODY}}": content.body,
    "{{CTA_LABEL}}": content.ctaLabel,
    "{{CTA_URL}}": content.ctaUrl,
    "{{YEAR}}": year,
    "{{UNSUBSCRIBE_BLOCK}}": unsubscribeBlock,
  };

  let html = fs.readFileSync(TEMPLATE_PATH, "utf8");

  for (const [token, value] of Object.entries(tokenMap)) {
    if (value === undefined) {
      throw new Error(`Missing a value for ${token}`);
    }
    html = html.split(token).join(value);
  }

  const leftoverTokens = html.match(/{{[A-Z_]+}}/g);
  if (leftoverTokens) {
    throw new Error(`Unresolved tokens in output: ${leftoverTokens.join(", ")}`);
  }

  return html;
}

const DATA_URI_IMAGE = /src="data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)"/g;

export interface EmailAttachment {
  cid: string;
  content: Buffer;
  contentType: string;
}

export interface RenderedEmail {
  html: string;
  attachments: EmailAttachment[];
}

export function renderEmailForSmtp(content: EmailContent): RenderedEmail {
  const html = renderEmail(content);
  const attachments: EmailAttachment[] = [];
  let count = 0;

  const htmlWithCids = html.replace(DATA_URI_IMAGE, (_match, subtype: string, base64: string) => {
    count += 1;
    const cid = `arisoft-inline-image-${count}`;
    attachments.push({
      cid,
      content: Buffer.from(base64, "base64"),
      contentType: `image/${subtype}`,
    });
    return `src="cid:${cid}"`;
  });

  return { html: htmlWithCids, attachments };
}
