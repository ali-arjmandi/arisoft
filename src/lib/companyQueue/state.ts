import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { queueState } from "@/lib/db/schema";
import type { GenerateEmailsMode } from "./status";
import type { QueueStateRecord } from "./types";

const SINGLETON_ID = 1;
const TICK_LOCK_STALE_MINUTES = 10;

// Lazily creates the singleton row if it doesn't exist yet, instead of
// relying on a seed migration (this repo has no seed-data system). Safe
// under concurrent callers: the insert is a no-op on conflict, so a lost
// race just falls through to the re-select.
export async function getQueueState(): Promise<QueueStateRecord> {
  const db = getDb();
  const [existing] = await db.select().from(queueState).where(eq(queueState.id, SINGLETON_ID)).limit(1);
  if (existing) return existing;

  const inserted = await db
    .insert(queueState)
    .values({ id: SINGLETON_ID })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  const [row] = await db.select().from(queueState).where(eq(queueState.id, SINGLETON_ID)).limit(1);
  return row;
}

export async function setQueueRunning(isRunning: boolean): Promise<QueueStateRecord> {
  const db = getDb();
  const [row] = await db
    .insert(queueState)
    .values({ id: SINGLETON_ID, isRunning })
    .onConflictDoUpdate({
      target: queueState.id,
      set: { isRunning, updatedAt: sql`now()` },
    })
    .returning();
  return row;
}

export async function setGenerateEmailsMode(generateEmailsMode: GenerateEmailsMode): Promise<QueueStateRecord> {
  const db = getDb();
  const [row] = await db
    .insert(queueState)
    .values({ id: SINGLETON_ID, generateEmailsMode })
    .onConflictDoUpdate({
      target: queueState.id,
      set: { generateEmailsMode, updatedAt: sql`now()` },
    })
    .returning();
  return row;
}

// Prevents an overlapping tick invocation (a scheduler firing again before
// the previous call finished, landing on a different concurrent Lambda
// instance) from claiming and processing its own extra batch on top of one
// already in flight. Atomic single UPDATE, not a separate
// read-then-write — the isRunning check and the lock acquisition happen in
// the same statement, so there's no gap for two ticks to both see "free"
// and both proceed. A lock older than TICK_LOCK_STALE_MINUTES is treated as
// abandoned (the holder was killed mid-tick, e.g. a Lambda timeout, before
// reaching releaseTickLock's `finally`) and can be reclaimed.
export async function tryAcquireTickLock(): Promise<boolean> {
  const db = getDb();
  const staleThreshold = new Date(Date.now() - TICK_LOCK_STALE_MINUTES * 60_000);
  const acquired = await db
    .update(queueState)
    .set({ lockedAt: new Date() })
    .where(
      and(
        eq(queueState.id, SINGLETON_ID),
        eq(queueState.isRunning, true),
        or(isNull(queueState.lockedAt), lt(queueState.lockedAt, staleThreshold)),
      ),
    )
    .returning({ id: queueState.id });
  return acquired.length > 0;
}

export async function releaseTickLock(): Promise<void> {
  const db = getDb();
  await db.update(queueState).set({ lockedAt: null }).where(eq(queueState.id, SINGLETON_ID));
}
