import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { emailSendState } from "@/lib/db/schema";
import type { EmailSendStateRecord } from "./types";

const SINGLETON_ID = 1;
const TICK_LOCK_STALE_MINUTES = 10;

// Same lazy-create-if-missing shape as companyQueue/state.ts's
// getQueueState() — no seed-data system in this repo, so the singleton row
// is created on first read/write instead.
export async function getEmailSendState(): Promise<EmailSendStateRecord> {
  const db = getDb();
  const [existing] = await db.select().from(emailSendState).where(eq(emailSendState.id, SINGLETON_ID)).limit(1);
  if (existing) return existing;

  const inserted = await db
    .insert(emailSendState)
    .values({ id: SINGLETON_ID })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  const [row] = await db.select().from(emailSendState).where(eq(emailSendState.id, SINGLETON_ID)).limit(1);
  return row;
}

export async function setEmailSendRunning(isRunning: boolean): Promise<EmailSendStateRecord> {
  const db = getDb();
  const [row] = await db
    .insert(emailSendState)
    .values({ id: SINGLETON_ID, isRunning })
    .onConflictDoUpdate({
      target: emailSendState.id,
      set: { isRunning, updatedAt: sql`now()` },
    })
    .returning();
  return row;
}

// Same overlapping-tick guard as companyQueue/state.ts's
// tryAcquireTickLock() — matters even more here: two overlapping ticks
// would each independently see "enough time has passed since the last
// send" and each send an email, defeating the pacing entirely rather than
// just exceeding a batch-size cap.
export async function tryAcquireSendLock(): Promise<boolean> {
  const db = getDb();
  const staleThreshold = new Date(Date.now() - TICK_LOCK_STALE_MINUTES * 60_000);
  const acquired = await db
    .update(emailSendState)
    .set({ lockedAt: new Date() })
    .where(
      and(
        eq(emailSendState.id, SINGLETON_ID),
        eq(emailSendState.isRunning, true),
        or(isNull(emailSendState.lockedAt), lt(emailSendState.lockedAt, staleThreshold)),
      ),
    )
    .returning({ id: emailSendState.id });
  return acquired.length > 0;
}

export async function releaseSendLock(): Promise<void> {
  const db = getDb();
  await db.update(emailSendState).set({ lockedAt: null }).where(eq(emailSendState.id, SINGLETON_ID));
}
