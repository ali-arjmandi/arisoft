import type { companyQueueItems, queueState } from "@/lib/db/schema";

export type CompanyQueueItemRecord = typeof companyQueueItems.$inferSelect;
export type QueueStateRecord = typeof queueState.$inferSelect;

export interface QueueItemInput {
  companyName: string;
  kvkNumber: string | null;
}
