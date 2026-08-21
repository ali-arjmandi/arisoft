import { analyzeCompany, type CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import { generateOutreachEmail } from "@/lib/companyAnalyzer/generateOutreachEmail";
import { getCompanyById, getContactPersonsByCompanyId, saveCompanyAnalysis } from "@/lib/companies/companies";
import { createGeneratedEmail } from "@/lib/companies/emails";
import type { CompanyRecord, ContactPersonRecord } from "@/lib/companies/types";
import { content as defaultContent } from "@/lib/email/content";
import { ALLOWED_SENDERS } from "@/lib/email/senders";
import { claimNextBatch, markQueueItemDone, markQueueItemFailed } from "./queue";
import { getQueueState, releaseTickLock, tryAcquireTickLock } from "./state";
import type { GenerateEmailsMode } from "./status";
import type { CompanyQueueItemRecord } from "./types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

interface EmailRecipient {
  to: string;
  contactPersonId?: string;
}

// The general research email plus every found contact person's email,
// deduped case- and whitespace-insensitively (a contact sharing the same
// address as the general inbox, or as another contact, must not get
// emailed twice in the same run).
function buildRecipients(generalEmail: string | null, contacts: ContactPersonRecord[]): EmailRecipient[] {
  const seen = new Set<string>();
  const recipients: EmailRecipient[] = [];

  if (generalEmail) {
    const trimmed = generalEmail.trim();
    seen.add(trimmed.toLowerCase());
    recipients.push({ to: trimmed });
  }

  for (const contact of contacts) {
    if (!contact.email) continue;
    const trimmed = contact.email.trim();
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push({ to: trimmed, contactPersonId: contact.id });
  }

  return recipients;
}

async function analyzeAndSave(item: CompanyQueueItemRecord): Promise<{ analysis: CompanyAnalysis; company: CompanyRecord }> {
  const analysis = await analyzeCompany({ companyName: item.companyName, kvkNumber: item.kvkNumber });
  const { company } = await saveCompanyAnalysis(analysis);
  return { analysis, company };
}

export interface ProcessQueueItemOptions {
  generateEmailsMode: GenerateEmailsMode;
}

// Never throws — every branch ends in a status write, so a single item's
// failure can't take down the rest of a batch (see runQueueTick below).
export async function processQueueItem(
  item: CompanyQueueItemRecord,
  options: ProcessQueueItemOptions,
): Promise<void> {
  let analysis: CompanyAnalysis;
  let company: CompanyRecord;

  try {
    // A retry of a previously-partial success (company already saved, only
    // the email step failed) reuses the stored analysis instead of paying
    // for another OpenAI research call.
    const existing = item.companyId ? await getCompanyById(item.companyId) : null;
    if (existing) {
      analysis = existing.analysis;
      company = existing;
    } else {
      ({ analysis, company } = await analyzeAndSave(item));
    }
  } catch (error) {
    await markQueueItemFailed(item.id, errorMessage(error));
    return;
  }

  const contacts = await getContactPersonsByCompanyId(company.id);
  const recipients = buildRecipients(analysis.contact.generalEmail, contacts);

  if (options.generateEmailsMode === "off" || recipients.length === 0) {
    await markQueueItemDone(item.id, company.id);
    return;
  }

  try {
    // One generation per company, reused for every recipient — a
    // personalized name-by-name greeting isn't safe to reuse across
    // multiple people, so the prompt is told to keep it generic whenever
    // there's more than one recipient (see generateOutreachEmail).
    const generated = await generateOutreachEmail(analysis, company.id, { genericGreeting: recipients.length > 1 });
    const status = options.generateEmailsMode === "draft" ? "draft" : "queued";
    // Off by default — generated drafts/queued emails shouldn't carry an
    // unsubscribe link until someone deliberately enables it while editing.
    const content = { ...defaultContent, ...generated, unsubscribeUrl: "" };
    const inserts = recipients.map((recipient) =>
      createGeneratedEmail({
        companyId: company.id,
        contactPersonId: recipient.contactPersonId,
        to: recipient.to,
        from: ALLOWED_SENDERS[0],
        content,
        status,
      }),
    );
    // "queued" mode sends straight to every recipient without leaving an
    // editable copy behind, so the company detail page's "Email templates"
    // section stays empty for these companies. Mirror the manual
    // "Generate email" flow (generate-email/route.ts) by also stashing the
    // primary recipient's copy as a draft template — recipients[0] is the
    // general email when found, else the first contact (see buildRecipients).
    if (status === "queued") {
      inserts.push(
        createGeneratedEmail({
          companyId: company.id,
          contactPersonId: recipients[0].contactPersonId,
          to: recipients[0].to,
          from: ALLOWED_SENDERS[0],
          content,
          status: "draft",
        }),
      );
    }
    await Promise.all(inserts);
  } catch (error) {
    await markQueueItemFailed(item.id, `Company saved, but outreach email failed: ${errorMessage(error)}`, company.id);
    return;
  }

  await markQueueItemDone(item.id, company.id);
}

export async function runQueueTick(): Promise<{ isRunning: boolean }> {
  const state = await getQueueState();
  if (!state.isRunning) return { isRunning: false };

  // Guards against an overlapping invocation (a scheduler firing again
  // before the previous tick finished, landing on a different concurrent
  // Lambda instance) claiming and processing its own extra QUEUE_BATCH_SIZE
  // batch on top of one already in flight — a no-op if the lock is already
  // held, not "not running" (isRunning is still true, just busy).
  if (!(await tryAcquireTickLock())) return { isRunning: true };

  try {
    // Default of 1 (not the old 3) matters more now than it used to: a
    // scheduler-triggered tick call blocks until the whole batch finishes
    // (each item's analysis can take up to ~1 minute), and that latency is
    // no longer absorbed by a patient client-side poll loop, just a caller
    // waiting on the HTTP response.
    const batchSize = Number(process.env.QUEUE_BATCH_SIZE) || 1;
    const claimed = await claimNextBatch(batchSize);
    const options: ProcessQueueItemOptions = { generateEmailsMode: state.generateEmailsMode };

    // Processed one at a time rather than concurrently: each item runs a
    // token-heavy web-search research call plus a large structured-analysis
    // call, and running several of those at once easily bursts past an
    // org's tokens-per-minute limit even with the OpenAI SDK's own built-in
    // retries (2 by default) already exhausted. processQueueItem never
    // throws — every branch ends in a status write — so one item's failure
    // still can't block the rest of the batch.
    for (const item of claimed) {
      await processQueueItem(item, options);
    }

    return { isRunning: true };
  } finally {
    await releaseTickLock();
  }
}
