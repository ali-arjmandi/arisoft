import { listQueuedEmails } from "@/lib/companies/emails";
import { EmailQueueTable } from "./EmailQueueTable";

// Reads live data from the database on every request — must not be
// statically prerendered at build time (build has no DB connection).
export const dynamic = "force-dynamic";

export default async function DashboardEmailQueuePage() {
  const items = await listQueuedEmails();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Email queue</h1>
        <p className="mt-1 text-sm text-body">
          Emails that have been generated but not yet sent — created manually or automatically by the company
          queue. Review one, then send or discard it.
        </p>
      </div>
      <EmailQueueTable initialItems={items} />
    </div>
  );
}
