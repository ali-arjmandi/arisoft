"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ClientReportData } from "@/lib/reports/clientReportData";

type DownloadStatus = "idle" | "generating" | "error";

function track(token: string, type: "view" | "download") {
  fetch(`/api/report/${token}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
    keepalive: true,
  }).catch(() => {
    // Best-effort — a tracking failure must never block or error out the
    // visitor's actual experience of the page/download.
  });
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "report"
  );
}

export function ReportPageClient({ token, data }: { token: string; data: ClientReportData }) {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>("idle");

  useEffect(() => {
    track(token, "view");
    // Fire once per page load — token/data don't change during the
    // lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload() {
    setDownloadStatus("generating");
    try {
      const { generateReportPdf } = await import("@/lib/reports/generateReportPdf");
      const blob = await generateReportPdf(data);
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `arisoft-report-${slugify(data.companyName)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      track(token, "download");
      setDownloadStatus("idle");
    } catch (error) {
      console.error("Report PDF download failed:", error);
      setDownloadStatus("error");
    }
  }

  const hasFindings = data.servicesListed.length > 0 || data.manualProcessSignals.length > 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center gap-2.5">
        <span className="relative h-9 w-9 overflow-hidden rounded-xl">
          <Image src="/images/logo/icon-blue-bg.png" alt="" width={518} height={518} className="h-full w-full object-cover" />
        </span>
        <span className="text-lg font-bold tracking-tight text-foreground">Arisoft</span>
      </div>

      <div className="mt-10">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Automation opportunity report</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{data.companyName}</h1>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
          {data.websiteUrl && <span>{data.websiteUrl}</span>}
          {data.industrySubsegment && <span>{data.industrySubsegment}</span>}
          {data.kvkNumber && <span>KvK {data.kvkNumber}</span>}
        </div>
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Overview</h2>
        <p className="mt-3 text-sm leading-relaxed text-body">{data.companySummary}</p>
      </section>

      {hasFindings && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">What we noticed</h2>
          <ul className="mt-3 space-y-2">
            {data.servicesListed.map((item, index) => (
              <li key={`service-${index}`} className="flex gap-2 text-sm leading-relaxed text-body">
                <span className="text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
            {data.manualProcessSignals.map((item, index) => (
              <li key={`signal-${index}`} className="flex gap-2 text-sm leading-relaxed text-body">
                <span className="text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.opportunities.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Where we can help</h2>
          <div className="mt-4 space-y-4">
            {data.opportunities.map((opportunity, index) => (
              <div
                key={index}
                className={`rounded-xl border p-5 ${
                  opportunity.isBestMatch ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{opportunity.opportunity}</h3>
                  {opportunity.isBestMatch && (
                    <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
                      Recommended focus
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary">
                  {opportunity.arisoftService}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-body">{opportunity.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Want to talk this through?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-body">
          We&apos;d be happy to walk through these opportunities with you and see what fits.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/#contact"
            className="rounded-full bg-blue-gradient border border-primary px-8 py-3 text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50"
          >
            Get in touch
          </Link>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadStatus === "generating"}
            className="rounded-full border border-primary px-8 py-3 text-sm font-medium text-primary transition hover:bg-surface-muted disabled:opacity-60"
          >
            {downloadStatus === "generating" ? "Preparing PDF..." : "Download PDF report"}
          </button>
        </div>
        {downloadStatus === "error" && (
          <p className="mt-3 text-sm font-medium text-red-600">
            Something went wrong preparing the PDF. Please try again.
          </p>
        )}
      </section>

      <footer className="mt-10 text-center text-xs text-muted">
        Arisoft · arisoft.nl · info@arisoft.nl
      </footer>
    </main>
  );
}
