import { listInboxThreads } from "@/lib/email/inbox";
import { InboxAutoSync } from "./InboxAutoSync";
import { InboxTable } from "./InboxTable";

// Reads live data from the database on every request — must not be
// statically prerendered at build time (build has no DB connection).
export const dynamic = "force-dynamic";

export default async function DashboardInboxPage() {
  const threads = await listInboxThreads();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inbox</h1>
        <p className="mt-1 text-sm text-body">
          Conversations from your mailboxes. New mail appears automatically while this page is open.
        </p>
      </div>
      <InboxAutoSync />
      <InboxTable threads={threads} />
    </div>
  );
}
