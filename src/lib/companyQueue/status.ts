export type QueueItemStatus = "waiting" | "processing" | "done" | "failed";

export const QUEUE_ITEM_STATUSES: QueueItemStatus[] = ["waiting", "processing", "done", "failed"];
