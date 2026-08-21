"use client";

import { useEffect, useState } from "react";
import type { CompanyQueueItemRecord } from "@/lib/companyQueue/types";
import type { GenerateEmailsMode } from "@/lib/companyQueue/status";
import { AddQueueItemForm } from "./AddQueueItemForm";
import { QueueCsvUpload } from "./QueueCsvUpload";
import { QueueItemsTable } from "./QueueItemsTable";

const POLL_INTERVAL_MS = 10_000;

const GENERATE_EMAILS_MODE_HELP: Record<GenerateEmailsMode, string> = {
  off: "Companies are still analyzed and saved, but no email is generated for them.",
  draft: "Companies are analyzed, saved, and get a draft email — review it before queuing.",
  queued: "Companies are analyzed, saved, and get an email queued, ready to send.",
};

export function QueuePageClient({
  initialItems,
  initialIsRunning,
  initialGenerateEmailsMode,
  batchSize,
}: {
  initialItems: CompanyQueueItemRecord[];
  initialIsRunning: boolean;
  initialGenerateEmailsMode: GenerateEmailsMode;
  batchSize: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [isRunning, setIsRunning] = useState(initialIsRunning);
  const [toggling, setToggling] = useState(false);
  const [generateEmailsMode, setGenerateEmailsMode] = useState(initialGenerateEmailsMode);
  const [generateEmailsSaving, setGenerateEmailsSaving] = useState(false);

  // Polls continuously (not just while running) so the list — and the
  // running/stopped state itself — stays live even when this tab isn't the
  // one driving processing (another tab or admin started/stopped it, or
  // added items). A single in-flight poll at a time: the next one is only
  // scheduled once the previous resolves, not on a fixed interval, since a
  // tick can legitimately take up to ~a minute when it does claim work
  // (the analyze step), which would otherwise overlap a naive setInterval.
  // A failed fetch is treated as a soft "try again next cycle."
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    async function tick() {
      try {
        const res = await fetch("/api/dashboard/queue/tick", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setItems(data.items);
          setIsRunning(data.isRunning);
        }
      } catch {
        // swallowed — see comment above
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(tick, POLL_INTERVAL_MS);
        }
      }
    }

    tick();

    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, []);

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

  async function handleGenerateEmailsModeChange(mode: GenerateEmailsMode) {
    setGenerateEmailsSaving(true);
    try {
      const res = await fetch("/api/dashboard/queue/generate-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setGenerateEmailsMode(data.generateEmailsMode);
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
            <label htmlFor="generate-emails-mode" className="text-sm font-medium text-foreground">
              Outreach emails
            </label>
            <select
              id="generate-emails-mode"
              value={generateEmailsMode}
              onChange={(event) => handleGenerateEmailsModeChange(event.target.value as GenerateEmailsMode)}
              disabled={generateEmailsSaving}
              className="mt-1 block w-full rounded-lg border border-[#AAAAAA] px-3 py-2 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60"
            >
              <option value="off">Don&apos;t generate emails</option>
              <option value="draft">Generate as draft</option>
              <option value="queued">Generate and queue</option>
            </select>
            <p className="mt-1 text-xs text-muted">{GENERATE_EMAILS_MODE_HELP[generateEmailsMode]}</p>
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
