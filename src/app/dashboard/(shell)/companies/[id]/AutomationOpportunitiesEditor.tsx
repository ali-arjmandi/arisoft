"use client";

import { ARISOFT_SERVICES, type ArisoftService, type AutomationOpportunity } from "@/lib/companyAnalyzer/analyzeCompany";

const inputClassName =
  "mt-1 w-full rounded-lg border border-[#AAAAAA] px-3 py-2 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary";

function emptyOpportunity(): AutomationOpportunity {
  return { opportunity: "", arisoftService: ARISOFT_SERVICES[0], explanation: "", evidenceSource: "", isBestMatch: false };
}

export function AutomationOpportunitiesEditor({
  opportunities,
  onChange,
}: {
  opportunities: AutomationOpportunity[];
  onChange: (opportunities: AutomationOpportunity[]) => void;
}) {
  function updateOpportunity(index: number, patch: Partial<AutomationOpportunity>) {
    onChange(opportunities.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeOpportunity(index: number) {
    onChange(opportunities.filter((_, i) => i !== index));
  }

  function addOpportunity() {
    onChange([...opportunities, emptyOpportunity()]);
  }

  // Only one opportunity can be the best match, so marking one true clears
  // it on every other item in the same update.
  function markAsBest(index: number) {
    onChange(opportunities.map((item, i) => ({ ...item, isBestMatch: i === index })));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Automation opportunities</h3>
        <button
          type="button"
          onClick={addOpportunity}
          className="rounded-full border border-primary px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-surface-muted"
        >
          Add opportunity
        </button>
      </div>
      <div className="mt-3 space-y-4">
        {opportunities.length === 0 && <p className="text-sm text-muted">No opportunities yet.</p>}
        {opportunities.map((opportunity, index) => (
          <div
            key={index}
            className={`rounded-lg border p-4 ${opportunity.isBestMatch ? "border-primary" : "border-border"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                <input
                  type="radio"
                  name="best-match-opportunity"
                  checked={opportunity.isBestMatch ?? false}
                  onChange={() => markAsBest(index)}
                  className="h-4 w-4 accent-primary"
                />
                Best match
              </label>
              <button
                type="button"
                onClick={() => removeOpportunity(index)}
                className="shrink-0 text-xs font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted">Opportunity</label>
                <input
                  type="text"
                  value={opportunity.opportunity}
                  onChange={(event) => updateOpportunity(index, { opportunity: event.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted">Arisoft service</label>
                <select
                  value={opportunity.arisoftService}
                  onChange={(event) =>
                    updateOpportunity(index, { arisoftService: event.target.value as ArisoftService })
                  }
                  className={inputClassName}
                >
                  {ARISOFT_SERVICES.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium uppercase tracking-wide text-muted">Explanation</label>
              <textarea
                rows={2}
                value={opportunity.explanation}
                onChange={(event) => updateOpportunity(index, { explanation: event.target.value })}
                className={inputClassName}
              />
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium uppercase tracking-wide text-muted">Evidence source</label>
              <input
                type="text"
                value={opportunity.evidenceSource}
                onChange={(event) => updateOpportunity(index, { evidenceSource: event.target.value })}
                className={inputClassName}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
