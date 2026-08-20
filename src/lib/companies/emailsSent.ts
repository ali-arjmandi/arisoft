import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { contactPersons, emailsSent } from "@/lib/db/schema";
import type { AllowedSender } from "@/lib/email/senders";
import type { EmailContent } from "@/lib/email/content";

export interface RecordEmailSentInput {
  companyId: string;
  contactPersonId?: string;
  to: string;
  from: AllowedSender;
  content: EmailContent;
}

// Best-effort logging, called after a send has already succeeded. Callers
// must wrap this in try/catch — a logging failure must never turn an
// already-sent email into a user-facing failure.
export async function recordEmailSent(input: RecordEmailSentInput): Promise<void> {
  const db = getDb();
  let contactPersonId: string | null = null;
  let contactNameSnapshot: string | null = null;

  if (input.contactPersonId) {
    // Looked up fresh (not trusted from the client) so the snapshot reflects
    // the contact's actual name at the moment of sending.
    const [contact] = await db
      .select({ id: contactPersons.id, name: contactPersons.name })
      .from(contactPersons)
      .where(eq(contactPersons.id, input.contactPersonId))
      .limit(1);
    if (contact) {
      contactPersonId = contact.id;
      contactNameSnapshot = contact.name;
    }
  }

  await db.insert(emailsSent).values({
    companyId: input.companyId,
    contactPersonId,
    contactNameSnapshot,
    contactEmailSnapshot: input.to,
    fromSender: input.from,
    content: input.content,
  });
}
