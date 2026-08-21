import { listQueueItems } from "@/lib/companyQueue/queue";
import { getQueueState } from "@/lib/companyQueue/state";
import { QueuePageClient } from "./QueuePageClient";

// Reads live data from the database on every request — must not be
// statically prerendered at build time (build has no DB connection).
export const dynamic = "force-dynamic";

export default async function DashboardQueuePage() {
  const [items, state] = await Promise.all([listQueueItems(), getQueueState()]);
  const batchSize = Number(process.env.QUEUE_BATCH_SIZE) || 3;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Company queue</h1>
        <p className="mt-1 text-sm text-body">
          Add companies by name or KVK number, one at a time or via CSV, then start processing to run each one
          through the analyzer, save it to Companies, and queue an outreach email automatically.
        </p>
      </div>
      <QueuePageClient
        initialItems={items}
        initialIsRunning={state.isRunning}
        initialGenerateEmails={state.generateEmails}
        batchSize={batchSize}
      />
    </div>
  );
}
