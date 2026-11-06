import nodemailer from "nodemailer";
import type { AllowedSender } from "./senders";
import type { EmailAttachment } from "./render";

const APP_PASSWORD_ENV_BY_SENDER: Record<AllowedSender, string> = {
  "info@arisoft.nl": "DASHBOARD_SMTP_INFO_APP_PASSWORD",
  "a.arjmandi@arisoft.nl": "DASHBOARD_SMTP_ARJMANDI_APP_PASSWORD",
};

export interface SendEmailInput {
  to: string;
  from: AllowedSender;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  inReplyTo?: string;
  references?: string[];
  // For a send inside a request with a deadline; nodemailer's defaults run to minutes.
  timeoutMs?: number;
}

// The same app password also authenticates IMAP (src/lib/email/inbox.ts).
export function getMailboxPassword(mailbox: AllowedSender): string {
  const envVar = APP_PASSWORD_ENV_BY_SENDER[mailbox];
  const appPassword = process.env[envVar];
  if (!appPassword) {
    throw new Error(`Missing ${envVar} — cannot use ${mailbox}.`);
  }
  return appPassword;
}

export async function sendEmail({
  to,
  from,
  subject,
  html,
  attachments,
  inReplyTo,
  references,
  timeoutMs,
}: SendEmailInput): Promise<void> {
  const appPassword = getMailboxPassword(from);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: from,
      pass: appPassword,
    },
    ...(timeoutMs ? { connectionTimeout: timeoutMs, greetingTimeout: timeoutMs, socketTimeout: timeoutMs } : {}),
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments,
    inReplyTo,
    references,
  });
}
