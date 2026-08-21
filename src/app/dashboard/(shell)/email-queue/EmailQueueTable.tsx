"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import type { QueuedEmailListItem } from "@/lib/companies/types";
import { usePagination } from "../usePagination";
import { Pagination } from "../Pagination";

const POLL_INTERVAL_MS = 10_000;

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function EmailQueueTable({
  initialItems,
  initialIsRunning,
}: {
  initialItems: QueuedEmailListItem[];
  initialIsRunning: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [isRunning, setIsRunning] = useState(initialIsRunning);
  const [toggling, setToggling] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { page, setPage, totalPages, pageItems } = usePagination(items, 10);

  // Keeps the list, and the publish running/stopped state, live — new rows
  // queued by the company queue, sends made by the background /api/cron/tick
  // job, or another tab starting/stopping publishing all show up without a
  // manual reload. This is a read-only display poll; it never triggers a
  // send itself. A single in-flight poll at a time: the next one is only
  // scheduled once the previous resolves, not on a fixed interval.
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    async function poll() {
      try {
        const res = await fetch("/api/dashboard/email-queue");
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setItems(data.items);
          setIsRunning(data.isRunning);
        }
      } catch {
        // soft fail — try again next cycle
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    }

    timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, []);

  async function handleTogglePublishing() {
    setToggling(true);
    try {
      const res = await fetch(`/api/dashboard/email-queue/publish/${isRunning ? "stop" : "start"}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setIsRunning(data.isRunning);
      }
    } finally {
      setToggling(false);
    }
  }

  async function handleSend(item: QueuedEmailListItem) {
    if (!window.confirm(`Send this email to ${item.contactEmailSnapshot}?`)) return;
    setBusyId(item.id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/email-queue/${item.id}/send`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to send email.");
      }
      setItems((prev) => prev.filter((existing) => existing.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: QueuedEmailListItem) {
    if (!window.confirm("Discard this queued email? This can't be undone.")) return;
    setBusyId(item.id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/email-queue/${item.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to discard email.");
      }
      setItems((prev) => prev.filter((existing) => existing.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard email.");
    } finally {
      setBusyId(null);
    }
  }

  const publishControls = (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-foreground">Publishing {isRunning ? "running" : "stopped"}</p>
        <p className="text-xs text-muted">
          {isRunning
            ? "Sending one email at a time, spaced out to protect sender reputation — safe to close this tab."
            : "Click Resume to gradually send every queued email, spaced out rather than all at once."}
        </p>
      </div>
      <button
        type="button"
        onClick={handleTogglePublishing}
        disabled={toggling}
        className={
          isRunning
            ? "rounded-full border border-danger px-6 py-2.5 text-sm font-medium text-danger transition hover:bg-danger-tint disabled:opacity-60"
            : "rounded-full bg-blue-gradient border border-primary px-6 py-2.5 text-sm font-medium text-white transition disabled:opacity-60"
        }
      >
        {toggling ? "..." : isRunning ? "Stop" : "Publish"}
      </button>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        {publishControls}
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No emails queued right now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {publishControls}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-6 py-3">Company</th>
              <th className="px-6 py-3">To</th>
              <th className="px-6 py-3">From</th>
              <th className="px-6 py-3">Added</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item) => {
              const expanded = expandedId === item.id;
              const busy = busyId === item.id;
              return (
                <Fragment key={item.id}>
                  <tr className="border-b border-border last:border-0 hover:bg-surface-muted">
                    <td
                      className="cursor-pointer px-6 py-4 font-medium text-foreground"
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                    >
                      {item.companyId ? (
                        <Link
                          href={`/dashboard/companies/${item.companyId}`}
                          onClick={(event) => event.stopPropagation()}
                          className="hover:underline"
                        >
                          {item.companyName}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-body" onClick={() => setExpandedId(expanded ? null : item.id)}>
                      {item.contactNameSnapshot ?? item.contactEmailSnapshot}
                    </td>
                    <td className="px-6 py-4 text-body" onClick={() => setExpandedId(expanded ? null : item.id)}>
                      {item.fromSender}
                    </td>
                    <td className="px-6 py-4 text-body" onClick={() => setExpandedId(expanded ? null : item.id)}>
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => handleSend(item)}
                          disabled={busy}
                          className="text-primary hover:underline disabled:opacity-60"
                        >
                          Send
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={busy}
                          className="text-red-600 hover:underline disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-border bg-surface-muted last:border-0">
                      <td colSpan={5} className="px-6 py-4">
                        <dl className="space-y-3">
                          <DetailField label="To" value={item.contactEmailSnapshot} />
                          <DetailField label="Subject" value={item.content.subject} />
                          {item.content.preheader && <DetailField label="Preheader" value={item.content.preheader} />}
                          {item.content.heading && <DetailField label="Heading" value={item.content.heading} />}
                          {item.sendError && (
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-danger">
                                Last publish attempt failed{item.sendAttemptedAt ? ` (${formatDate(item.sendAttemptedAt)})` : ""}
                              </dt>
                              <dd className="mt-1 text-sm text-danger">{item.sendError}</dd>
                            </div>
                          )}
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Body</dt>
                            {/* Read-only preview of content generated by our own AI flow or composed by
                                an admin — same trust level as anything else already stored in emails,
                                not arbitrary external input. */}
                            <dd
                              className="mt-1 text-sm text-foreground [&_a]:text-primary [&_a]:underline"
                              dangerouslySetInnerHTML={{ __html: item.content.body }}
                            />
                          </div>
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
