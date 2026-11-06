import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { invoiceEmails, invoices, vatAlerts } from "@/lib/db/schema";
import type { EmailContent } from "@/lib/email/content";
import { renderEmailForSmtp } from "@/lib/email/render";
import { escapeHtml } from "@/lib/email/reply";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderInvoicePdf } from "./renderInvoicePdf";
import type { InvoiceRow } from "./store";
import { OSS_THRESHOLD_CENTS } from "./vatRates";

const FROM = "info@arisoft.nl";
// Shorter than the Lambda limit, as the tick's other work runs beside this.
const BUDGET_MS = 15_000;
// HSM gives up after 20 seconds, cold start included.
const REQUEST_BUDGET_MS = 6_000;
const REQUEST_CAP_MS = 10_000;
const SMTP_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 10;
const RETRY_BASE_MS = 5 * 60 * 1000;
// A Lambda killed mid-send leaves a claim behind; this frees it. If SMTP had
// already accepted that mail, the buyer gets it twice.
const STALE_CLAIM = sql`now() - interval '10 minutes'`;

// Only the code: messages from pg and SMTP can hold query values or the address.
export const errorCode = (error: unknown): string => {
  const { code, cause, responseCode } = error as { code?: unknown; cause?: { code?: unknown }; responseCode?: unknown };
  return String(cause?.code ?? code ?? responseCode ?? (error instanceof Error ? error.name : "unknown"));
};

const emptyContent = { ctaLabel: "", ctaUrl: "", unsubscribeUrl: "" };

function invoiceEmailContent(row: InvoiceRow): EmailContent {
  const isCredit = row.kind === "credit_note";
  const name = isCredit ? "credit note" : "invoice";
  const title = `${isCredit ? "Credit note" : "Invoice"} ${row.number}`;
  const greeting = row.buyer.name ? `Hello ${escapeHtml(row.buyer.name)},` : "Hello,";
  return {
    ...emptyContent,
    subject: `${title} from ${row.seller.legalName}`,
    preheader: `Your ${name} is attached.`,
    eyebrow: isCredit ? "Credit note" : "Invoice",
    heading: title,
    body: `<p>${greeting}</p><p>Your ${name} is attached as a PDF. There is nothing you need to pay.</p>`,
  };
}

async function claimNextEmail(): Promise<string | undefined> {
  const { rows } = await getDb().execute<{ invoice_id: string }>(sql`
    update invoice_emails set status = 'sending', claimed_at = now(), attempts = attempts + 1
    where invoice_id = (
      select invoice_id from invoice_emails
      where (status = 'pending' and next_try_at <= now()) or (status = 'sending' and claimed_at < ${STALE_CLAIM})
      order by next_try_at limit 1 for update skip locked
    )
    returning invoice_id`);
  return rows[0]?.invoice_id;
}

async function deliver(invoiceId: string): Promise<void> {
  const db = getDb();
  try {
    const [row] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
    const pdf = await renderInvoicePdf(row);
    const content = invoiceEmailContent(row);
    const { html, attachments } = renderEmailForSmtp(content);
    await sendEmail({
      to: row.buyer.email!,
      from: FROM,
      subject: content.subject,
      html,
      attachments: [...attachments, { filename: `${row.number}.pdf`, content: pdf, contentType: "application/pdf" }],
      timeoutMs: SMTP_TIMEOUT_MS,
    });
    await db.update(invoiceEmails).set({ status: "sent", sentAt: new Date() }).where(eq(invoiceEmails.invoiceId, invoiceId));
  } catch (error) {
    console.error("[invoice-email]", invoiceId, errorCode(error));
    const [email] = await db.select({ attempts: invoiceEmails.attempts }).from(invoiceEmails).where(eq(invoiceEmails.invoiceId, invoiceId));
    const giveUp = email.attempts >= MAX_ATTEMPTS;
    await db
      .update(invoiceEmails)
      .set({ status: giveUp ? "failed" : "pending", nextTryAt: new Date(Date.now() + RETRY_BASE_MS * 2 ** email.attempts) })
      .where(eq(invoiceEmails.invoiceId, invoiceId));
  }
}

const eur = (cents: number) => `€${(cents / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

function alertContent(alert: typeof vatAlerts.$inferSelect): EmailContent {
  const test = alert.scope === "test" ? "[TEST] " : "";
  const crossed = alert.levelCents === OSS_THRESHOLD_CENTS;
  const subject = crossed
    ? `${test}Action needed: EU sales crossed €10,000, invoices now use country VAT`
    : `${test}EU sales passed ${eur(alert.levelCents)} in ${alert.year}`;
  const body = crossed
    ? `<p>Sales to consumers in other EU countries in ${alert.year} reached ${eur(alert.totalCents)} excl. VAT with invoice ${alert.invoiceNumber}.</p>
<p>That invoice and every later EU sale outside the Netherlands use the buyer's country rate, not 21%.</p>
<p>Do this now with your accountant: register for OSS, report these sales in the OSS return, and leave the sales before it in the normal Dutch return.</p>`
    : `<p>Sales to consumers in other EU countries in ${alert.year} reached ${eur(alert.totalCents)} excl. VAT with invoice ${alert.invoiceNumber}.</p>
<p>At €10,000 invoices switch by themselves to the buyer's country rate, which needs an OSS registration. Prepare that with your accountant now.</p>`;
  return { ...emptyContent, subject, preheader: subject, eyebrow: "VAT threshold", heading: subject, body };
}

async function sendVatAlerts(): Promise<number> {
  const db = getDb();
  const pending = await db.select().from(vatAlerts).where(isNull(vatAlerts.sentAt));
  let sent = 0;
  for (const alert of pending) {
    console.warn("[vat-alert]", alert.scope, alert.year, alert.levelCents, alert.invoiceNumber);
    try {
      const content = alertContent(alert);
      const { html, attachments } = renderEmailForSmtp(content);
      const to = process.env.ARISOFT_VAT_ALERT_EMAIL || "a.arjmandi@arisoft.nl";
      await sendEmail({ to, from: FROM, subject: content.subject, html, attachments, timeoutMs: SMTP_TIMEOUT_MS });
      await db
        .update(vatAlerts)
        .set({ sentAt: new Date() })
        .where(and(eq(vatAlerts.scope, alert.scope), eq(vatAlerts.year, alert.year), eq(vatAlerts.levelCents, alert.levelCents)));
      sent += 1;
    } catch (error) {
      console.error("[vat-alert] send failed", errorCode(error)); // Stays unsent, so the next tick tries again.
    }
  }
  return sent;
}

// Sends what is due, oldest first, so a mail that failed earlier gets another
// try here too. Catches everything: a failure must not fail its caller.
export async function runInvoiceEmailTick(budgetMs = BUDGET_MS): Promise<{ emails: number; alerts: number } | null> {
  try {
    const deadline = Date.now() + budgetMs;
    const alerts = await sendVatAlerts();
    let emails = 0;
    while (Date.now() < deadline) {
      const invoiceId = await claimNextEmail();
      if (!invoiceId) break;
      await deliver(invoiceId);
      emails += 1;
    }
    return { emails, alerts };
  } catch (error) {
    console.error("[invoice-email] tick failed", errorCode(error));
    return null;
  }
}

// System mail goes straight from the request; the outreach queue is for
// company mail only. A Lambda stops once it has answered, so this runs before
// the answer. The cap always wins: a slow SMTP leaves the row to be reclaimed,
// and the invoice is already stored.
export async function sendInvoiceEmailsNow(capMs = REQUEST_CAP_MS): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const cap = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, capMs);
  });
  await Promise.race([runInvoiceEmailTick(REQUEST_BUDGET_MS), cap]);
  clearTimeout(timer);
}
