"use client";

import { useEffect, useRef, useState } from "react";
import type { CompanyQueueItemRecord } from "@/lib/companyQueue/types";
import { AddQueueItemForm } from "./AddQueueItemForm";
import { QueueCsvUpload } from "./QueueCsvUpload";
import { QueueItemsTable } from "./QueueItemsTable";

const POLL_INTERVAL_MS = 10_000;

export function QueuePageClient({
  initialItems,
  initialIsRunning,
  initialGenerateEmails,
  batchSize,
}: {
  initialItems: CompanyQueueItemRecord[];
  initialIsRunning: boolean;
  initialGenerateEmails: boolean;
  batchSize: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [isRunning, setIsRunning] = useState(initialIsRunning);
  const [toggling, setToggling] = useState(false);
  const [generateEmails, setGenerateEmails] = useState(initialGenerateEmails);
  const [generateEmailsSaving, setGenerateEmailsSaving] = useState(false);
  const isRunningRef = useRef(isRunning);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // A single in-flight tick per tab: the next tick is only scheduled once
  // the previous one resolves (success or failure), not on a fixed
  // interval. A tick can legitimately take up to ~a minute (the analyze
  // step), which would otherwise overlap a naive 10s setInterval. A failed
  // fetch is treated as a soft "try again next cycle" — the server-side
  // work may have completed even if the response never arrived.
  useEffect(() => {
    if (!isRunning) return;

    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/dashboard/queue/tick", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setItems(data.items);
        }
      } catch {
        // swallowed — see comment above
      } finally {
        if (!cancelled && isRunningRef.current) {
          timeoutRef.current = window.setTimeout(tick, POLL_INTERVAL_MS);
        }
      }
    }

    tick();

    return () => {
      cancelled = true;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [isRunning]);

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await fetch(`/api/dashboard/queue/${isRunning ? "stop" : "start"}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setIsRunning(data.isRunning);
      }
    } finally {
      setToggling(false);
    }
  }

  async function handleGenerateEmailsChange(enabled: boolean) {
    setGenerateEmailsSaving(true);
    try {
      const res = await fetch("/api/dashboard/queue/generate-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setGenerateEmails(data.generateEmails);
      }
    } finally {
      setGenerateEmailsSaving(false);
    }
  }

  function handleItemAdded(item: CompanyQueueItemRecord) {
    setItems((prev) => [item, ...prev]);
  }

  function handleItemsImported(imported: CompanyQueueItemRecord[]) {
    setItems((prev) => [...imported, ...prev]);
  }

  function handleItemDeleted(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleItemRetried(item: CompanyQueueItemRecord) {
    setItems((prev) => prev.map((existing) => (existing.id === item.id ? item : existing)));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-foreground">{isRunning ? "Running" : "Stopped"}</p>
          <p className="text-xs text-muted">
            {isRunning
              ? `Processing up to ${batchSize} at a time while this page stays open.`
              : "Processing is paused. Click Resume to continue working through the queue."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={generateEmails}
                onChange={(event) => handleGenerateEmailsChange(event.target.checked)}
                disabled={generateEmailsSaving}
                className="h-4 w-4 rounded border-[#AAAAAA] accent-primary"
              />
              Generate outreach emails
            </label>
            <p className="mt-1 text-xs text-muted">
              {generateEmails
                ? "Companies are analyzed, saved, and queued an email."
                : "Companies are still analyzed and saved, but no email is queued for them."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            className={
              isRunning
                ? "rounded-full border border-danger px-6 py-2.5 text-sm font-medium text-danger transition hover:bg-danger-tint disabled:opacity-60"
                : "rounded-full bg-blue-gradient border border-primary px-6 py-2.5 text-sm font-medium text-white transition disabled:opacity-60"
            }
          >
            {toggling ? "..." : isRunning ? "Stop" : "Start"}
          </button>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Add companies</h2>
        <AddQueueItemForm onAdded={handleItemAdded} />
        <hr className="border-border" />
        <QueueCsvUpload onImported={handleItemsImported} />
      </div>

      <QueueItemsTable items={items} onDeleted={handleItemDeleted} onRetried={handleItemRetried} />
    </div>
  );
}
