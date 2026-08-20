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
}

export async function sendEmail({ to, from, subject, html, attachments }: SendEmailInput): Promise<void> {
  const envVar = APP_PASSWORD_ENV_BY_SENDER[from];
  const appPassword = process.env[envVar];
  if (!appPassword) {
    throw new Error(`Missing ${envVar} — cannot send as ${from}.`);
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: from,
      pass: appPassword,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments,
  });
}
