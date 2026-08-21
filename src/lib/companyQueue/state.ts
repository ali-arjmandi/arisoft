import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { queueState } from "@/lib/db/schema";
import type { QueueStateRecord } from "./types";

const SINGLETON_ID = 1;

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

export async function setGenerateEmails(generateEmails: boolean): Promise<QueueStateRecord> {
  const db = getDb();
  const [row] = await db
    .insert(queueState)
    .values({ id: SINGLETON_ID, generateEmails })
    .onConflictDoUpdate({
      target: queueState.id,
      set: { generateEmails, updatedAt: sql`now()` },
    })
    .returning();
  return row;
}
