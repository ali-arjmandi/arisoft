import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "company";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderField(label: string, value: string | null): string {
  const displayValue = value ? escapeHtml(value) : '<span class="muted">Not found</span>';
  return `<div class="field"><div class="label">${escapeHtml(label)}</div><div class="value">${displayValue}</div></div>`;
}

function renderList(label: string, items: string[]): string {
  const body =
    items.length > 0
      ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : '<div class="muted">None found</div>';
  return `<div class="field"><div class="label">${escapeHtml(label)}</div>${body}</div>`;
}

export function buildCompanyReportHtml(result: CompanyAnalysis, siteUrl: string): string {
  const opportunitiesHtml =
    result.automationOpportunities.length > 0
      ? result.automationOpportunities
          .map(
            (opportunity) => `
        <div class="opportunity">
          <div class="opportunity-header">
            <span class="opportunity-title">${escapeHtml(opportunity.opportunity)}${
              opportunity.isBestMatch ? ' <span class="tag best">Best fit</span>' : ""
            }</span>
            <span class="tag">${escapeHtml(opportunity.arisoftService)}</span>
          </div>
          <p>${escapeHtml(opportunity.explanation)}</p>
          <p class="muted small">Evidence: ${escapeHtml(opportunity.evidenceSource)}</p>
        </div>`,
          )
          .join("")
      : '<p class="muted">No opportunities identified.</p>';

  const decisionMakerContacts = result.decisionMakerContacts ?? [];
  const decisionMakersHtml =
    decisionMakerContacts.length > 0
      ? decisionMakerContacts
          .map(
            (contact) => `
        <div class="opportunity">
          <div class="opportunity-header">
            <span class="opportunity-title">${escapeHtml(contact.name)}</span>
            ${contact.role ? `<span class="tag">${escapeHtml(contact.role)}</span>` : ""}
          </div>
          <p>${contact.email ? escapeHtml(contact.email) : '<span class="muted">No email found</span>'}${
            contact.phone ? ` &middot; ${escapeHtml(contact.phone)}` : ""
          }</p>
          ${contact.evidenceSource ? `<p class="muted small">Source: ${escapeHtml(contact.evidenceSource)}</p>` : ""}
        </div>`,
          )
          .join("")
      : '<p class="muted">No decision maker contacts identified.</p>';

  // researchBrief is the Research Agent's raw notes, kept only for human
  // debugging on the company detail page - excluded here to keep the
  // downloaded file smaller and keep it out of the "Generate email" call
  // this form triggers.
  const analysisJson = JSON.stringify({ ...result, researchBrief: undefined });
  // GET, not POST: the session cookie is SameSite=Lax, so it's only sent on
  // a cross-site *GET* navigation (which is what happens when this file is
  // opened from disk and this form is submitted) — a cross-site POST would
  // never carry it, and the dashboard would always see an unauthenticated
  // request no matter how correct the target URL is.
  const formAction = `${siteUrl.replace(/\/$/, "")}/dashboard/company-analyzer`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Arisoft company analysis: ${escapeHtml(result.companyName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f3f4f6; color: #111827; margin: 0; padding: 40px 16px; }
  .card { max-width: 720px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .summary { color: #4b5563; margin: 0 0 24px; }
  .fit { display: inline-block; border: 1px solid #2563eb; color: #2563eb; border-radius: 999px; padding: 4px 14px; font-size: 14px; font-weight: 500; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .field { margin-bottom: 12px; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 2px; }
  .value { font-size: 14px; }
  .muted { color: #9ca3af; }
  .small { font-size: 12px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  ul { margin: 4px 0 0; padding-left: 20px; font-size: 14px; }
  .opportunity { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  .opportunity-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  .opportunity-title { font-weight: 500; font-size: 14px; }
  .tag { border: 1px solid #e5e7eb; border-radius: 999px; padding: 2px 10px; font-size: 12px; color: #6b7280; }
  .tag.best { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
  .cta { border: 1px solid #2563eb; background: #eff6ff; border-radius: 12px; padding: 16px; margin-top: 24px; }
  .cta p { margin: 0 0 12px; font-size: 13px; color: #4b5563; }
  button { background: #2563eb; color: #ffffff; border: none; border-radius: 999px; padding: 10px 20px; font-size: 14px; font-weight: 500; cursor: pointer; }
  button:hover { background: #1d4ed8; }
</style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(result.companyName)}</h1>
    <p class="summary">${escapeHtml(result.companySummary)}</p>
    <span class="fit">Fit ${result.fitScore}/5</span>

    <div class="grid">
      ${renderField("KVK number", result.kvkNumber)}
      ${renderField("Website", result.websiteUrl)}
      ${renderField("Website confidence", result.websiteConfidence)}
      ${renderField("Industry", result.industrySubsegment)}
      ${renderField("Size signal", result.estimatedSizeSignal)}
      ${renderField("General email", result.contact.generalEmail)}
      ${renderField("Phone", result.contact.phone)}
      ${renderField("Named contact", result.contact.namedContact)}
    </div>

    <hr />

    <div class="field">
      <div class="label">Decision maker contacts</div>
      ${decisionMakersHtml}
    </div>

    <hr />

    <div class="grid">
      ${renderList("Services listed", result.websiteFindings.servicesListed)}
      ${renderList("Manual process signals", result.websiteFindings.manualProcessSignals)}
      ${renderList("Open vacancies", result.websiteFindings.openVacancies)}
      ${renderList("Tools mentioned", result.websiteFindings.toolsMentioned)}
    </div>

    <hr />

    <div class="field">
      <div class="label">Automation opportunities</div>
      ${opportunitiesHtml}
    </div>

    <hr />

    ${renderField("Outreach angle", result.outreachAngle)}
    ${renderField("Research notes", result.researchNotes)}
    ${renderField("Fit score reason", result.fitScoreReason)}

    <div class="cta">
      <p>Opens this analysis in the Arisoft dashboard, ready to generate the outreach email.</p>
      <form method="GET" action="${escapeHtml(formAction)}" target="_blank">
        <input type="hidden" name="data" value="${escapeHtml(analysisJson)}" />
        <button type="submit">Generate email</button>
      </form>
    </div>
  </div>
</body>
</html>`;
}
