"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WEBSITE_CONFIDENCE_VALUES, type CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import { buildCompanyReportHtml, slugify } from "@/lib/companyAnalyzer/companyReportHtml";
import { EditableStringList } from "./EditableStringList";
import { AutomationOpportunitiesEditor } from "./AutomationOpportunitiesEditor";

type Status = "idle" | "saving" | "saved" | "error";

const inputClassName =
  "mt-2 w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary";

function toInputValue(value: string | null): string {
  return value ?? "";
}

function fromInputValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export function CompanyAnalysisEditor({
  companyId,
  initialAnalysis,
}: {
  companyId: string;
  initialAnalysis: CompanyAnalysis;
}) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<CompanyAnalysis>(initialAnalysis);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState("");

  function updateField<K extends keyof CompanyAnalysis>(key: K, value: CompanyAnalysis[K]) {
    setAnalysis((prev) => ({ ...prev, [key]: value }));
  }

  function updateContactField(key: keyof CompanyAnalysis["contact"], value: string | null) {
    setAnalysis((prev) => ({ ...prev, contact: { ...prev.contact, [key]: value } }));
  }

  function updateWebsiteFindings(key: keyof CompanyAnalysis["websiteFindings"], items: string[]) {
    setAnalysis((prev) => ({ ...prev, websiteFindings: { ...prev.websiteFindings, [key]: items } }));
  }

  async function handleSave() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch(`/api/dashboard/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save changes.");
      }
      setAnalysis(data.company.analysis);
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this company, its contacts, and its email history? This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/companies/${companyId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to delete company.");
      }
      router.push("/dashboard/companies");
    } catch (err) {
      setDeleting(false);
      setError(err instanceof Error ? err.message : "Failed to delete company.");
    }
  }

  async function handleRegenerate() {
    if (
      !window.confirm(
        'Regenerate this analysis? This replaces every field below with fresh AI research. Nothing is saved until you click "Save changes".',
      )
    ) {
      return;
    }
    setRegenerateError("");
    setRegenerating(true);
    try {
      const res = await fetch("/api/dashboard/analyze-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: analysis.companyName, kvkNumber: analysis.kvkNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to regenerate analysis.");
      }
      setAnalysis(data.result);
      setStatus("idle");
    } catch (err) {
      setRegenerateError(err instanceof Error ? err.message : "Failed to regenerate analysis.");
    } finally {
      setRegenerating(false);
    }
  }

  function handleDownloadReport() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://arisoft.nl";
    const html = buildCompanyReportHtml(analysis, siteUrl);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `arisoft-analysis-${slugify(analysis.companyName)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">Analysis</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadReport}
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-surface-muted"
          >
            Download report
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating || status === "saving" || deleting}
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-surface-muted disabled:opacity-60"
          >
            {regenerating ? "Regenerating..." : "Regenerate analysis"}
          </button>
          <div className="shrink-0 rounded-full border border-primary px-4 py-1.5 text-sm font-medium text-primary">
            Fit {analysis.fitScore}/5
          </div>
        </div>
      </div>
      {regenerateError && <p className="text-sm font-medium text-red-600">{regenerateError}</p>}

      <div>
        <label className="text-sm font-medium text-foreground">Company name</label>
        <input
          type="text"
          value={analysis.companyName}
          onChange={(event) => updateField("companyName", event.target.value)}
          className={inputClassName}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Company summary</label>
        <textarea
          rows={3}
          value={analysis.companySummary}
          onChange={(event) => updateField("companySummary", event.target.value)}
          className={inputClassName}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-foreground">KVK number</label>
          <input
            type="text"
            value={toInputValue(analysis.kvkNumber)}
            onChange={(event) => updateField("kvkNumber", fromInputValue(event.target.value))}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Website</label>
          <input
            type="text"
            value={toInputValue(analysis.websiteUrl)}
            onChange={(event) => updateField("websiteUrl", fromInputValue(event.target.value))}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Website confidence</label>
          <select
            value={analysis.websiteConfidence}
            onChange={(event) =>
              updateField("websiteConfidence", event.target.value as CompanyAnalysis["websiteConfidence"])
            }
            className={inputClassName}
          >
            {WEBSITE_CONFIDENCE_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Industry</label>
          <input
            type="text"
            value={toInputValue(analysis.industrySubsegment)}
            onChange={(event) => updateField("industrySubsegment", fromInputValue(event.target.value))}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Size signal</label>
          <input
            type="text"
            value={toInputValue(analysis.estimatedSizeSignal)}
            onChange={(event) => updateField("estimatedSizeSignal", fromInputValue(event.target.value))}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Fit score</label>
          <select
            value={analysis.fitScore}
            onChange={(event) => updateField("fitScore", Number(event.target.value))}
            className={inputClassName}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">General email</label>
          <input
            type="text"
            value={toInputValue(analysis.contact.generalEmail)}
            onChange={(event) => updateContactField("generalEmail", fromInputValue(event.target.value))}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Phone</label>
          <input
            type="text"
            value={toInputValue(analysis.contact.phone)}
            onChange={(event) => updateContactField("phone", fromInputValue(event.target.value))}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Named contact</label>
          <input
            type="text"
            value={toInputValue(analysis.contact.namedContact)}
            onChange={(event) => updateContactField("namedContact", fromInputValue(event.target.value))}
            className={inputClassName}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Fit score reason</label>
        <textarea
          rows={2}
          value={analysis.fitScoreReason}
          onChange={(event) => updateField("fitScoreReason", event.target.value)}
          className={inputClassName}
        />
      </div>

      <hr className="border-border" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
        <EditableStringList
          label="Services listed"
          items={analysis.websiteFindings.servicesListed}
          onChange={(items) => updateWebsiteFindings("servicesListed", items)}
        />
        <EditableStringList
          label="Manual process signals"
          items={analysis.websiteFindings.manualProcessSignals}
          onChange={(items) => updateWebsiteFindings("manualProcessSignals", items)}
        />
        <EditableStringList
          label="Open vacancies"
          items={analysis.websiteFindings.openVacancies}
          onChange={(items) => updateWebsiteFindings("openVacancies", items)}
        />
        <EditableStringList
          label="Tools mentioned"
          items={analysis.websiteFindings.toolsMentioned}
          onChange={(items) => updateWebsiteFindings("toolsMentioned", items)}
        />
      </div>

      <hr className="border-border" />

      <AutomationOpportunitiesEditor
        opportunities={analysis.automationOpportunities}
        onChange={(opportunities) => updateField("automationOpportunities", opportunities)}
      />

      <hr className="border-border" />

      <div>
        <label className="text-sm font-medium text-foreground">Outreach angle</label>
        <textarea
          rows={2}
          value={analysis.outreachAngle}
          onChange={(event) => updateField("outreachAngle", event.target.value)}
          className={inputClassName}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Research notes</label>
        <textarea
          rows={3}
          value={toInputValue(analysis.researchNotes)}
          onChange={(event) => updateField("researchNotes", fromInputValue(event.target.value))}
          className={inputClassName}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || regenerating || status === "saving"}
          className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete company"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving" || regenerating || deleting}
          className="rounded-full bg-blue-gradient border border-primary px-7 py-3 text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50 disabled:opacity-60"
        >
          {status === "saving" ? "Saving..." : "Save changes"}
        </button>
      </div>
      {status === "saved" && <p className="text-right text-sm font-medium text-emerald-600">Saved.</p>}
      {error && <p className="text-right text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
