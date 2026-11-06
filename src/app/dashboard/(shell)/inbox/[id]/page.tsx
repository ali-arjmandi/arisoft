import Link from "next/link";
import { notFound } from "next/navigation";
import { getInboxThread } from "@/lib/email/inbox";
import { isOutbound } from "@/lib/email/inboxThreads";
import { formatInboxDate } from "../formatInboxDate";
import { InboxAutoSync } from "../InboxAutoSync";
import { ReplyForm } from "./ReplyForm";

// Reads live data from the database on every request — must not be
// statically prerendered at build time (build has no DB connection).
export const dynamic = "force-dynamic";

export default async function DashboardInboxThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getInboxThread(id);
  if (thread.length === 0) {
    notFound();
  }
  const replyTarget = thread.findLast((message) => !isOutbound(message));
  const replyTo = replyTarget?.replyToAddress ?? replyTarget?.fromAddress;

  return (
    <div className="space-y-6">
      <InboxAutoSync />
      <Link href="/dashboard/inbox" className="text-sm font-medium text-primary hover:underline">
        Back to inbox
      </Link>
      <h1 className="text-xl font-semibold text-foreground">{(replyTarget ?? thread[0]).subject}</h1>

      {thread.map((message) => {
        const outbound = isOutbound(message);
        return (
          <div
            key={message.id}
            className={`space-y-3 rounded-dashboard-card border border-border p-6 shadow-dashboard-card ${
              outbound ? "ml-8 bg-surface-muted" : "mr-8 bg-surface"
            }`}
          >
            <p className="text-sm text-body">
              <span className="font-medium text-foreground">
                {outbound ? `You (${message.mailbox})` : (message.fromName ?? message.fromAddress)}
              </span>{" "}
              · {formatInboxDate(message.receivedAt)}
            </p>
            {/* Rendered as React text on purpose: mail content is untrusted. */}
            <p className="whitespace-pre-wrap break-words text-sm text-foreground">
              {message.bodyText || "(This message has no text content.)"}
            </p>
          </div>
        );
      })}

      {replyTarget && replyTo ? (
        <ReplyForm messageId={replyTarget.id} to={replyTo} from={replyTarget.mailbox} />
      ) : (
        <p className="text-sm text-muted">This conversation has no address to reply to.</p>
      )}
    </div>
  );
}
