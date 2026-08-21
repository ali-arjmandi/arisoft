import { listQueuedEmails } from "@/lib/companies/emails";
import { getEmailSendState } from "@/lib/email/publishState";
import { EmailQueueTable } from "./EmailQueueTable";

// Reads live data from the database on every request — must not be
// statically prerendered at build time (build has no DB connection).
export const dynamic = "force-dynamic";

export default async function DashboardEmailQueuePage() {
  const [items, state] = await Promise.all([listQueuedEmails(), getEmailSendState()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Email queue</h1>
        <p className="mt-1 text-sm text-body">
          Emails that have been generated but not yet sent — created manually or automatically by the company
          queue. Send or discard one manually below, or use Publish to send them all gradually and safely.
        </p>
      </div>
      <EmailQueueTable initialItems={items} initialIsRunning={state.isRunning} />
    </div>
  );
}
