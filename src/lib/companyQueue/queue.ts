import { and, asc, desc, eq, inArray, lt, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companyQueueItems } from "@/lib/db/schema";
import type { CompanyQueueItemRecord, QueueItemInput } from "./types";

const STALE_PROCESSING_MINUTES = 10;

export async function listQueueItems(): Promise<CompanyQueueItemRecord[]> {
  const db = getDb();
  return db.select().from(companyQueueItems).orderBy(desc(companyQueueItems.createdAt));
}

export async function addQueueItem(input: QueueItemInput): Promise<CompanyQueueItemRecord> {
  const db = getDb();
  const [created] = await db
    .insert(companyQueueItems)
    .values({ companyName: input.companyName, kvkNumber: input.kvkNumber })
    .returning();
  return created;
}

export async function addQueueItems(inputs: QueueItemInput[]): Promise<CompanyQueueItemRecord[]> {
  if (inputs.length === 0) return [];
  const db = getDb();
  return db
    .insert(companyQueueItems)
    .values(inputs.map((input) => ({ companyName: input.companyName, kvkNumber: input.kvkNumber })))
    .returning();
}

// Deleting an in-flight "processing" row is confusing (a worker may still
// write to it), and deleting a "done" row loses the queue's history for no
// benefit since the resulting company record already exists independently
// — so only waiting/failed items can be removed.
export async function deleteQueueItem(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(companyQueueItems)
    .where(and(eq(companyQueueItems.id, id), inArray(companyQueueItems.status, ["waiting", "failed"])))
    .returning({ id: companyQueueItems.id });
  return deleted.length > 0;
}

export async function retryQueueItem(id: string): Promise<CompanyQueueItemRecord | null> {
  const db = getDb();
  const [updated] = await db
    .update(companyQueueItems)
    .set({ status: "waiting", errorMessage: null, updatedAt: new Date() })
    .where(and(eq(companyQueueItems.id, id), eq(companyQueueItems.status, "failed")))
    .returning();
  return updated ?? null;
}

// Atomically claims up to batchSize items so two overlapping ticks (two
// browser tabs, or a slow previous tick still finishing) never claim the
// same row: FOR UPDATE SKIP LOCKED lets a second concurrent transaction
// simply skip rows already locked by the first, rather than blocking on
// them. Also reclaims "processing" rows stuck past STALE_PROCESSING_MINUTES
// (closed tab mid-batch, killed server) as if they were "waiting" again.
export async function claimNextBatch(batchSize: number): Promise<CompanyQueueItemRecord[]> {
  if (batchSize <= 0) return [];
  const db = getDb();
  const staleThreshold = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60_000);

  return db.transaction(async (tx) => {
    const eligible = await tx
      .select({ id: companyQueueItems.id })
      .from(companyQueueItems)
      .where(
        or(
          eq(companyQueueItems.status, "waiting"),
          and(eq(companyQueueItems.status, "processing"), lt(companyQueueItems.updatedAt, staleThreshold)),
        ),
      )
      .orderBy(asc(companyQueueItems.createdAt))
      .limit(batchSize)
      .for("update", { skipLocked: true });

    if (eligible.length === 0) return [];

    return tx
      .update(companyQueueItems)
      .set({ status: "processing", updatedAt: new Date() })
      .where(
        inArray(
          companyQueueItems.id,
          eligible.map((row) => row.id),
        ),
      )
      .returning();
  });
}

export async function markQueueItemDone(id: string, companyId: string): Promise<void> {
  const db = getDb();
  await db
    .update(companyQueueItems)
    .set({ status: "done", companyId, errorMessage: null, updatedAt: new Date() })
    .where(eq(companyQueueItems.id, id));
}

export async function markQueueItemFailed(
  id: string,
  errorMessage: string,
  companyId?: string | null,
): Promise<void> {
  const db = getDb();
  await db
    .update(companyQueueItems)
    .set({
      status: "failed",
      errorMessage,
      updatedAt: new Date(),
      ...(companyId !== undefined ? { companyId } : {}),
    })
    .where(eq(companyQueueItems.id, id));
}
