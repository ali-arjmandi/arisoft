import { analyzeCompany, type CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import { generateOutreachEmail } from "@/lib/companyAnalyzer/generateOutreachEmail";
import { getCompanyById, saveCompanyAnalysis } from "@/lib/companies/companies";
import { queueGeneratedEmail } from "@/lib/companies/emails";
import type { CompanyRecord } from "@/lib/companies/types";
import { content as defaultContent } from "@/lib/email/content";
import { ALLOWED_SENDERS } from "@/lib/email/senders";
import { claimNextBatch, markQueueItemDone, markQueueItemFailed } from "./queue";
import { getQueueState } from "./state";
import type { CompanyQueueItemRecord } from "./types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

async function analyzeAndSave(item: CompanyQueueItemRecord): Promise<{ analysis: CompanyAnalysis; company: CompanyRecord }> {
  const analysis = await analyzeCompany({ companyName: item.companyName, kvkNumber: item.kvkNumber });
  const { company } = await saveCompanyAnalysis(analysis);
  return { analysis, company };
}

export interface ProcessQueueItemOptions {
  generateEmails: boolean;
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

  if (!options.generateEmails || !analysis.contact.generalEmail) {
    await markQueueItemDone(item.id, company.id);
    return;
  }

  try {
    const generated = await generateOutreachEmail(analysis);
    await queueGeneratedEmail({
      companyId: company.id,
      to: analysis.contact.generalEmail,
      from: ALLOWED_SENDERS[0],
      content: { ...defaultContent, ...generated },
    });
  } catch (error) {
    await markQueueItemFailed(item.id, `Company saved, but outreach email failed: ${errorMessage(error)}`, company.id);
    return;
  }

  await markQueueItemDone(item.id, company.id);
}

export async function runQueueTick(): Promise<{ isRunning: boolean }> {
  const state = await getQueueState();
  if (!state.isRunning) return { isRunning: false };

  const batchSize = Number(process.env.QUEUE_BATCH_SIZE) || 3;
  const claimed = await claimNextBatch(batchSize);
  const options: ProcessQueueItemOptions = { generateEmails: state.generateEmails };
  await Promise.allSettled(claimed.map((item) => processQueueItem(item, options)));
  return { isRunning: true };
}
