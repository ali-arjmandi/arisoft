"use client";

import { useState } from "react";
import Link from "next/link";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import { EMAIL_PREFILL_STORAGE_KEY, type EmailHandoffMessage } from "@/lib/companyAnalyzer/emailHandoff";
import { buildCompanyReportHtml, slugify } from "@/lib/companyAnalyzer/companyReportHtml";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value ?? <span className="text-muted">Not found</span>}</dd>
    </div>
  );
}

function ListSection({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      {items.length > 0 ? (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <dd className="mt-1 text-sm text-muted">None found</dd>
      )}
    </div>
  );
}

export function CompanyAnalysisResult({ result }: { result: CompanyAnalysis }) {
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);

  async function handleSaveCompany() {
    setSaveError("");
    setSavingCompany(true);
    try {
      const res = await fetch("/api/dashboard/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: result }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save company.");
      }
      setSavedCompanyId(data.company.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save company.");
    } finally {
      setSavingCompany(false);
    }
  }

  function handleGenerateEmail() {
    setEmailError("");

    // Open synchronously, inside the click handler, so the browser never
    // treats this as a blocked popup — the tab shows its own loading state
    // (via the "awaiting" flag) until the AI call below finishes.
    const newTab = window.open("/dashboard/email?awaiting=1", "_blank");
    if (!newTab) {
      setEmailError("Your browser blocked the new tab. Allow pop-ups for this site and try again.");
      return;
    }

    setGeneratingEmail(true);

    void (async () => {
      let message: EmailHandoffMessage;
      try {
        const res = await fetch("/api/dashboard/generate-company-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to generate email.");
        }

        message = { status: "success", content: data.content };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to generate email.";
        message = { status: "error", message: errorMessage };
        setEmailError(errorMessage);
      }

      window.localStorage.setItem(EMAIL_PREFILL_STORAGE_KEY, JSON.stringify(message));
      setGeneratingEmail(false);
    })();
  }

  function handleDownloadReport() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://arisoft.nl";
    const html = buildCompanyReportHtml(result, siteUrl);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `arisoft-analysis-${slugify(result.companyName)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-8 space-y-6 rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{result.companyName}</h2>
          <p className="mt-1 text-sm text-body">{result.companySummary}</p>
        </div>
        <div className="shrink-0 rounded-full border border-primary px-4 py-1.5 text-sm font-medium text-primary">
          Fit {result.fitScore}/5
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="KVK number" value={result.kvkNumber} />
        <Field label="Website" value={result.websiteUrl} />
        <Field label="Website confidence" value={result.websiteConfidence} />
        <Field label="Industry" value={result.industrySubsegment} />
        <Field label="Size signal" value={result.estimatedSizeSignal} />
        <Field label="General email" value={result.contact.generalEmail} />
        <Field label="Phone" value={result.contact.phone} />
        <Field label="Named contact" value={result.contact.namedContact} />
        <Field label="Fit score reason" value={result.fitScoreReason} />
      </dl>

      <hr className="border-border" />

      <div>
        <h3 className="text-sm font-medium text-foreground">Decision maker contacts</h3>
        {result.decisionMakerContacts.length > 0 ? (
          <div className="mt-3 space-y-3">
            {result.decisionMakerContacts.map((contact, index) => (
              <div key={index} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{contact.name}</p>
                  {contact.role && (
                    <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
                      {contact.role}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-body">
                  {contact.email ?? <span className="text-muted">No email found</span>}
                  {contact.phone ? ` · ${contact.phone}` : ""}
                </p>
                {contact.evidenceSource && (
                  <p className="mt-2 text-xs text-muted">Source: {contact.evidenceSource}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No decision maker contacts identified.</p>
        )}
        <p className="mt-2 text-xs text-muted">
          Save this company first, then add any of these on its page under Contact persons.
        </p>
      </div>

      <hr className="border-border" />

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ListSection label="Services listed" items={result.websiteFindings.servicesListed} />
        <ListSection label="Manual process signals" items={result.websiteFindings.manualProcessSignals} />
        <ListSection label="Open vacancies" items={result.websiteFindings.openVacancies} />
        <ListSection label="Tools mentioned" items={result.websiteFindings.toolsMentioned} />
      </dl>

      <hr className="border-border" />

      <div>
        <h3 className="text-sm font-medium text-foreground">Automation opportunities</h3>
        {result.automationOpportunities.length > 0 ? (
          <div className="mt-3 space-y-3">
            {result.automationOpportunities.map((opportunity, index) => (
              <div
                key={index}
                className={`rounded-lg border p-4 ${opportunity.isBestMatch ? "border-primary" : "border-border"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {opportunity.opportunity}
                    {opportunity.isBestMatch && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        Best fit
                      </span>
                    )}
                  </p>
                  <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
                    {opportunity.arisoftService}
                  </span>
                </div>
                <p className="mt-2 text-sm text-body">{opportunity.explanation}</p>
                <p className="mt-2 text-xs text-muted">Evidence: {opportunity.evidenceSource}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No opportunities identified.</p>
        )}
      </div>

      <hr className="border-border" />

      <dl className="space-y-4">
        <Field label="Outreach angle" value={result.outreachAngle} />
        <Field label="Research notes" value={result.researchNotes} />
      </dl>

      <div className="rounded-lg border border-primary bg-surface-muted p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">Outreach email</h3>
            <p className="mt-1 text-xs text-muted">
              Opens the Email page in a new tab right away, then fills it in with a personalized email once
              the AI is done. The downloaded report has its own &ldquo;Generate email&rdquo; button that does
              the same thing.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={handleDownloadReport}
              className="rounded-full border border-primary px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-surface"
            >
              Download report
            </button>
            <button
              type="button"
              onClick={handleGenerateEmail}
              disabled={generatingEmail}
              className="rounded-full bg-blue-gradient border border-primary px-5 py-2.5 text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50 disabled:opacity-60"
            >
              {generatingEmail ? "Generating..." : "Generate email"}
            </button>
            {savedCompanyId ? (
              <Link
                href={`/dashboard/companies/${savedCompanyId}`}
                className="rounded-full border border-primary px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-surface"
              >
                View company →
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleSaveCompany}
                disabled={savingCompany}
                className="rounded-full border border-primary px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-surface disabled:opacity-60"
              >
                {savingCompany ? "Saving..." : "Save to Companies"}
              </button>
            )}
          </div>
        </div>
        {emailError && <p className="mt-2 text-sm font-medium text-red-600">{emailError}</p>}
        {saveError && <p className="mt-2 text-sm font-medium text-red-600">{saveError}</p>}
      </div>
    </div>
  );
}
