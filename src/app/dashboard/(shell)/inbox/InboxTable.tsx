"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InboxThread } from "@/lib/email/inboxThreads";
import { formatInboxDate } from "./formatInboxDate";
import { usePagination } from "../usePagination";
import { Pagination } from "../Pagination";
import { useSearchFilter } from "../useSearchFilter";
import { SearchInput } from "../SearchInput";

export function InboxTable({ threads }: { threads: InboxThread[] }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const getSearchText = useCallback(
    (item: InboxThread) => `${item.contactName} ${item.subject} ${item.mailbox}`,
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(threads, getSearchText);
  const { page, setPage, totalPages, pageItems, pageSize } = usePagination(filtered, 10);

  async function handleSync() {
    setSyncing(true);
    setError("");
    try {
      // Each call imports one batch; keep going until a mailbox has nothing new.
      for (;;) {
        const res = await fetch("/api/dashboard/inbox/sync", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to sync.");
        router.refresh();
        if (data.failed > 0) throw new Error("A mailbox failed to sync. Check the server logs.");
        if (data.imported === 0) break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-64 flex-1">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search inbox..."
          />
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="rounded-full border border-primary px-6 py-2.5 text-sm font-medium text-primary transition hover:bg-surface-muted disabled:opacity-60"
        >
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {filtered.length === 0 ? (
        <p className="rounded-dashboard-card border border-border bg-surface p-8 text-center text-sm text-muted">
          {query ? `No conversations match "${query}".` : "No conversations yet. Click Sync now to import them."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="px-6 py-3">From</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Mailbox</th>
                  <th className="px-6 py-3">Last message</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
                    <td className="px-6 py-4 font-medium text-foreground">{item.contactName}</td>
                    <td className="px-6 py-4 text-body">
                      <Link href={`/dashboard/inbox/${item.id}`} className="hover:underline">
                        {item.subject}
                      </Link>
                      {item.messageCount > 1 && <span className="ml-2 text-xs text-muted">({item.messageCount})</span>}
                    </td>
                    <td className="px-6 py-4 text-body">{item.mailbox}</td>
                    <td className="px-6 py-4 text-body">{formatInboxDate(item.lastMessageAt)}</td>
                    <td className="px-6 py-4">
                      {item.awaitingReply ? (
                        <span className="text-xs font-medium text-primary">Needs reply</span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-600">Replied</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={filtered.length}
        pageSize={pageSize}
      />
    </div>
  );
}
