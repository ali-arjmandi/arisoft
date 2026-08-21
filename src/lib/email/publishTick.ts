import {
  claimNextQueuedEmailForSend,
  getEmailSendStats,
  markEmailSendFailed,
  markEmailSent,
  peekNextQueuedEmailForSend,
} from "@/lib/companies/emails";
import { getEmailSendState } from "./publishState";
import { renderEmailForSmtp } from "./render";
import { sendEmail } from "./sendEmail";

const MIN_INTERVAL_SECONDS = Number(process.env.EMAIL_SEND_MIN_INTERVAL_SECONDS) || 45;
const MAX_PER_HOUR = Number(process.env.EMAIL_SEND_MAX_PER_HOUR) || 20;
const MAX_PER_DAY = Number(process.env.EMAIL_SEND_MAX_PER_DAY) || 150;
const RETRY_COOLDOWN_MINUTES = Number(process.env.EMAIL_SEND_RETRY_COOLDOWN_MINUTES) || 30;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

// Adds 0-50% random jitter on top of the base interval so sends land at
// irregular intervals rather than a robotic fixed cadence — one of the
// patterns Gmail's own bulk-sender abuse detection looks for.
function jitteredIntervalMs(): number {
  const jitterFraction = Math.random() * 0.5;
  return MIN_INTERVAL_SECONDS * (1 + jitterFraction) * 1000;
}

// One send per tick, gated by pacing — this *is* the throttle, not a
// courtesy on top of one. Never throws: every branch that touches a claimed
// row ends in either markEmailSent or markEmailSendFailed, matching
// processQueueItem's never-throws contract in companyQueue/processing.ts.
export async function runEmailSendTick(): Promise<{ isRunning: boolean }> {
  const state = await getEmailSendState();
  if (!state.isRunning) return { isRunning: false };

  // Peek (read-only) before claiming: checking this sender's pace/caps
  // first means a row that's simply "not due yet" is never claimed, so it
  // never starts a retry-cooldown for no reason (see
  // claimNextQueuedEmailForSend's doc comment).
  const next = await peekNextQueuedEmailForSend(RETRY_COOLDOWN_MINUTES);
  if (!next) return { isRunning: true };

  const stats = await getEmailSendStats(next.fromSender);
  const notBeforeMs = stats.lastSentAt ? stats.lastSentAt.getTime() + jitteredIntervalMs() : 0;
  if (Date.now() < notBeforeMs) return { isRunning: true };
  if (stats.sentLastHour >= MAX_PER_HOUR || stats.sentLastDay >= MAX_PER_DAY) return { isRunning: true };

  const claimed = await claimNextQueuedEmailForSend(RETRY_COOLDOWN_MINUTES);
  if (!claimed) return { isRunning: true }; // lost the race to another tick

  try {
    const { html, attachments } = renderEmailForSmtp(claimed.content);
    await sendEmail({
      to: claimed.contactEmailSnapshot,
      from: claimed.fromSender,
      subject: claimed.content.subject,
      html,
      attachments,
    });
    await markEmailSent(claimed.id);
  } catch (error) {
    await markEmailSendFailed(claimed.id, errorMessage(error));
  }

  return { isRunning: true };
}
