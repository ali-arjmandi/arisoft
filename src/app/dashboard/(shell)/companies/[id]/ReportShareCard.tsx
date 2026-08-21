"use client";

import { useState } from "react";
import type { ReportEngagement } from "@/lib/reports/reportEvents";

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type CopyStatus = "idle" | "copying" | "copied" | "error";

export function ReportShareCard({
  companyId,
  initialEngagement,
}: {
  companyId: string;
  initialEngagement: ReportEngagement;
}) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [error, setError] = useState("");

  async function handleCopyLink() {
    setCopyStatus("copying");
    setError("");
    try {
      const res = await fetch(`/api/dashboard/companies/${companyId}/report-link`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create report link.");
      }
      await navigator.clipboard.writeText(data.url);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (err) {
      setCopyStatus("error");
      setError(err instanceof Error ? err.message : "Failed to copy report link.");
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Report</h2>
          <p className="mt-1 text-sm text-muted">
            A shareable link to a client-friendly report page, with a PDF download.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyLink}
          disabled={copyStatus === "copying"}
          className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-surface-muted disabled:opacity-60"
        >
          {copyStatus === "copying" ? "Copying..." : copyStatus === "copied" ? "Copied!" : "Copy report link"}
        </button>
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Views</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">{initialEngagement.viewCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Downloads</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">{initialEngagement.downloadCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Last viewed</dt>
          <dd className="mt-1 text-sm text-body">
            {initialEngagement.lastViewedAt ? formatDate(initialEngagement.lastViewedAt) : "Never"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Last downloaded</dt>
          <dd className="mt-1 text-sm text-body">
            {initialEngagement.lastDownloadedAt ? formatDate(initialEngagement.lastDownloadedAt) : "Never"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
