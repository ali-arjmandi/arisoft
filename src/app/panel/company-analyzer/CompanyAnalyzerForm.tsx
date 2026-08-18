"use client";

import { useState } from "react";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import { CompanyAnalysisResult } from "./CompanyAnalysisResult";

type Status = "idle" | "analyzing" | "error";

const fieldClassName =
  "mt-2 w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted";

export function CompanyAnalyzerForm({ initialResult = null }: { initialResult?: CompanyAnalysis | null }) {
  const [companyName, setCompanyName] = useState("");
  const [kvkNumber, setKvkNumber] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompanyAnalysis | null>(initialResult);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!companyName.trim() && !kvkNumber.trim()) {
      setStatus("error");
      setError("Provide a company name or KVK number.");
      return;
    }

    setStatus("analyzing");
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/panel/analyze-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, kvkNumber }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to analyze company.");
      }

      setResult(data.result as CompanyAnalysis);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to analyze company.");
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div>
          <label htmlFor="companyName" className="text-sm font-medium text-foreground">
            Company name
          </label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            disabled={status === "analyzing"}
            className={fieldClassName}
          />
        </div>

        <div>
          <label htmlFor="kvkNumber" className="text-sm font-medium text-foreground">
            KVK number
          </label>
          <input
            id="kvkNumber"
            type="text"
            value={kvkNumber}
            onChange={(event) => setKvkNumber(event.target.value)}
            disabled={status === "analyzing"}
            className={fieldClassName}
          />
        </div>

        <p className="text-xs text-muted">Provide at least one of the two fields above.</p>

        <button
          type="submit"
          disabled={status === "analyzing"}
          className="w-full rounded-full bg-blue-gradient border border-primary px-7 py-3.5 text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50 disabled:opacity-60"
        >
          {status === "analyzing" ? "Analyzing..." : "Analyze company"}
        </button>

        {status === "analyzing" && (
          <p className="text-center text-sm text-muted">
            This can take up to a minute, it&apos;s researching the company on the web.
          </p>
        )}
        {status === "error" && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
      </form>

      {result && <CompanyAnalysisResult result={result} />}
    </div>
  );
}
