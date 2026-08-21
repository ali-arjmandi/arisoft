export type QueueItemStatus = "waiting" | "processing" | "done" | "failed";

export const QUEUE_ITEM_STATUSES: QueueItemStatus[] = ["waiting", "processing", "done", "failed"];

// Controls whether/how the queue processor generates an outreach email
// right after saving each company: not at all, as a draft, or straight to
// queued (ready to send from the Email queue page).
export type GenerateEmailsMode = "off" | "draft" | "queued";

export const GENERATE_EMAILS_MODES: GenerateEmailsMode[] = ["off", "draft", "queued"];
