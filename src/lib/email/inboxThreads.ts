export interface InboxMessageMeta {
  id: string;
  mailbox: string;
  threadId: string;
  fromName: string | null;
  fromAddress: string | null;
  subject: string;
  receivedAt: Date;
}

export interface InboxThread {
  id: string;
  mailbox: string;
  subject: string;
  contactName: string;
  messageCount: number;
  lastMessageAt: Date;
  awaitingReply: boolean;
}

export function isOutbound(message: { mailbox: string; fromAddress: string | null }): boolean {
  return message.fromAddress?.toLowerCase() === message.mailbox;
}

// Expects newest-first input. A thread with nothing inbound is plain outreach
// that nobody answered, which belongs to the Email pages rather than an inbox.
export function groupInboxThreads(messages: InboxMessageMeta[]): InboxThread[] {
  const threads = new Map<string, InboxMessageMeta[]>();
  for (const message of messages) {
    const key = `${message.mailbox}:${message.threadId}`;
    threads.set(key, [...(threads.get(key) ?? []), message]);
  }

  return [...threads.values()].flatMap((thread) => {
    const [latest] = thread;
    const latestInbound = thread.find((message) => !isOutbound(message));
    if (!latestInbound) return [];
    return [
      {
        id: latest.id,
        mailbox: latest.mailbox,
        subject: latestInbound.subject,
        contactName: latestInbound.fromName ?? latestInbound.fromAddress ?? "Unknown sender",
        messageCount: thread.length,
        lastMessageAt: latest.receivedAt,
        awaitingReply: !isOutbound(latest),
      },
    ];
  });
}
