import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { emailSendState } from "@/lib/db/schema";
import type { EmailSendStateRecord } from "./types";

const SINGLETON_ID = 1;

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
