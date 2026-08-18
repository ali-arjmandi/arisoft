export const ALLOWED_SENDERS = ["info@arisoft.nl", "a.arjmandi@arisoft.nl"] as const;
export type AllowedSender = (typeof ALLOWED_SENDERS)[number];
