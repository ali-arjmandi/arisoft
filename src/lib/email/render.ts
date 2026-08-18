import fs from "fs";
import path from "path";
import type { EmailContent } from "./content";

const TEMPLATE_PATH = path.join(process.cwd(), "src", "lib", "email", "template.html");

export function renderEmail(content: EmailContent): string {
  const year = new Date().getFullYear().toString();

  const unsubscribeBlock = content.unsubscribeUrl
    ? `<a href="${content.unsubscribeUrl}" style="color:#999999;text-decoration:underline;">Unsubscribe</a>&nbsp;&middot;&nbsp;`
    : "";

  // The CTA button is optional (see the "Include CTA button" checkbox on
  // /panel/email). When either half is missing, this omits both the button
  // row and the "Or reply directly..." hint below it — that hint only makes
  // sense as an alternative to clicking a button, so it can't stay without one.
  const ctaBlock =
    content.ctaLabel && content.ctaUrl
      ? `<tr>
            <td class="mobile-padding"
              style="padding-top:28px;padding-right:40px;padding-bottom:8px;padding-left:40px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${content.ctaUrl}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="50%" strokecolor="#0140bf" fillcolor="#0140bf">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${content.ctaLabel}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#0140bf" class="brand-gradient"
                    style="border-radius:999px;background-color:#0140bf;background-image:linear-gradient(to right,#1e68fe,#0140bf);">
                    <a href="${content.ctaUrl}"
                      style="display:inline-block;padding-top:14px;padding-right:32px;padding-bottom:14px;padding-left:32px;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${content.ctaLabel}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding-top:12px;padding-right:40px;padding-bottom:0;padding-left:40px;">
              <p
                style="margin:0;mso-line-height-rule:exactly;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:13px;color:#666666;">
                Or reply directly to this email, a real person will get back to you.</p>
            </td>
          </tr>`
      : "";

  const tokenMap: Record<string, string> = {
    "{{PREHEADER}}": content.preheader,
    "{{EYEBROW}}": content.eyebrow,
    "{{HEADING}}": content.heading,
    "{{BODY}}": content.body,
    "{{CTA_BLOCK}}": ctaBlock,
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
  // Inline logo attachments (produced below) are referenced by cid: and have
  // no filename. User-uploaded attachments (added by the send route) have a
  // filename and no cid — nodemailer shows those as normal downloadable
  // attachments rather than inlining them into the HTML.
  cid?: string;
  filename?: string;
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
