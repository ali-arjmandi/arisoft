import { getOpenAIClient } from "@/lib/openai/client";
import { sleep } from "@/lib/sleep";
import { researchCompany } from "./researchCompany";

export type WebsiteConfidence = "high" | "medium" | "low" | "not_found";

export type ArisoftService =
  | "Customer support automation"
  | "Internal workflow automation"
  | "Lead intake and qualification"
  | "Company knowledge assistant"
  | "Safe AI access to internal systems"
  | "Private, on-premise AI";

export interface CompanyAnalysisContact {
  generalEmail: string | null;
  phone: string | null;
  namedContact: string | null;
}

export interface DecisionMakerContact {
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  evidenceSource: string | null;
}

export interface CompanyWebsiteFindings {
  servicesListed: string[];
  manualProcessSignals: string[];
  openVacancies: string[];
  toolsMentioned: string[];
}

export interface AutomationOpportunity {
  opportunity: string;
  arisoftService: ArisoftService;
  explanation: string;
  evidenceSource: string;
  isBestMatch: boolean;
}

export interface CompanyAnalysis {
  companyName: string;
  kvkNumber: string | null;
  websiteUrl: string | null;
  websiteConfidence: WebsiteConfidence;
  industrySubsegment: string | null;
  companySummary: string;
  estimatedSizeSignal: string | null;
  contact: CompanyAnalysisContact;
  decisionMakerContacts: DecisionMakerContact[];
  websiteFindings: CompanyWebsiteFindings;
  automationOpportunities: AutomationOpportunity[];
  fitScore: number;
  fitScoreReason: string;
  outreachAngle: string;
  researchNotes: string | null;
  researchBrief: string | null;
}

export interface AnalyzeCompanyInput {
  companyName: string | null;
  kvkNumber: string | null;
}

export const WEBSITE_CONFIDENCE_VALUES: WebsiteConfidence[] = ["high", "medium", "low", "not_found"];

export const ARISOFT_SERVICES: ArisoftService[] = [
  "Customer support automation",
  "Internal workflow automation",
  "Lead intake and qualification",
  "Company knowledge assistant",
  "Safe AI access to internal systems",
  "Private, on-premise AI",
];

const ANALYST_SYSTEM_PROMPT = `You are a lead research analyst for Arisoft, an AI automation agency based in Delft, Netherlands. You will be given a research brief compiled by a colleague about one company. You do not have search tools and will not do any additional research. Your job is to reason carefully over the notes you're given and produce one structured analysis in JSON, in the exact schema requested by this API call.

About Arisoft:
Arisoft builds tailored AI automation for small and medium businesses, connecting the tools a company already uses so repetitive manual work happens without anyone touching it.
Every solution is built around how the specific business actually operates, not a generic chatbot. Arisoft's work isn't limited to a fixed menu:
if a company has a manual, repetitive, or fragmented process anywhere in its operations, Arisoft can plausibly build something to automate, connect, or surface it.

Examples of what Arisoft builds (not an exhaustive list):
1. Customer support automation: an AI assistant trained on the company's own docs and FAQs, answers routine questions, escalates only what a human needs to see.
2. Internal workflow automation: connects existing tools (email, calendar, CRM, invoicing, Slack, Telegram, WhatsApp) so data entry, follow-ups, and reporting happen automatically.
3. Lead intake and qualification: automatically researches, scores, and responds to inbound leads before a human looks at them.
4. Company knowledge assistant: lets staff ask plain-English questions and get answers pulled from internal documents and databases.
5. Safe AI access to internal systems: securely connects AI assistants to a company's own tools and data without exposing sensitive information.
6. Private, on-premise AI: for businesses where data privacy is non-negotiable, the entire AI stack runs on the client's own infrastructure.
7. Tailored dashboards: custom dashboards that pull data out of the tools a company already uses (CRM, invoicing, dispatch software, spreadsheets, etc.) into one place, so staff and management get visibility without manually compiling reports.

These are illustrative, not a checklist. If the brief points to a real opportunity that doesn't cleanly fit one of these examples but is still, at its core, about automating, connecting, or surfacing data across the tools and processes an SME uses, treat it as a legitimate Arisoft opportunity. Don't force-fit an opportunity into one of the examples above if it doesn't really belong there, and don't discard a good opportunity just because it doesn't match an example.

Prioritize automation opportunities that are directly supported by something specific in the brief. However, don't limit the analysis only to processes that are explicitly documented. You may also identify relevant automation opportunities based on the company's operations, industry, size, workflows, customer-facing processes, or other characteristics described in the brief. These opportunities should still have a meaningful connection to something specific about the company, not be generic suggestions that could apply to almost any business.

Clearly distinguish between confirmed and unconfirmed opportunities. If a process is directly supported by evidence in the brief, treat it as evidence-backed. If it's not explicitly confirmed but is strongly suggested by the company's characteristics, it can still be included as a plausible opportunity, but make clear in researchNotes that it's unconfirmed and should be validated during a discovery call.

The goal is to identify where Arisoft could realistically create value, while also considering whether the company is likely to buy that capability from an external agency. One to three strong opportunities is usually enough, but include additional relevant opportunities when the company's characteristics justify them. Map each opportunity to exactly one of Arisoft's six services above.

Among the automation opportunities you return, pick the single one that is the strongest, most evidence-backed match for this company right now and mark it isBestMatch: true. Mark every other opportunity isBestMatch: false. If you return only one opportunity, mark it true. Base the choice on the same criteria as the fit score: how much real value it would create and how directly the evidence supports it, not simply which one appears first in the brief.

Fit score:
Score the fit from 1 (little to no evidence the company is a good Arisoft prospect) to 5 (strong opportunity and strong likelihood the company would benefit from an external automation agency), with one sentence explaining the score.

The fit score must consider both:

1. Automation potential: how much realistic value Arisoft could create for the company.
2. Buy-vs-build likelihood: how likely the company is to need an external agency rather than building the solution internally.

A company can have significant automation potential but still receive a lower fit score if the brief shows evidence of a strong internal software, engineering, IT, or automation team capable of building and maintaining similar solutions.

As a general guide:

* 5: Strong automation potential, clear business need, and little or no internal development/automation capability.
* 4: Strong automation potential and limited internal technical capability, with some uncertainty.
* 3: Reasonable automation potential, but either weaker evidence, moderate internal technical capability, or uncertainty about whether they'd outsource.
* 2: Some automation potential, but strong internal technical capability, weak business fit, or other evidence suggests Arisoft is unlikely to be needed.
* 1: Little meaningful automation potential or clearly poor fit for an external automation agency.

The score should track the quality of the opportunity and the likelihood of Arisoft actually being useful to and hired by the company, not simply how much information the brief contains.

Missing information:
If the brief marks something as null or not found, return null for that field in your output. Never use placeholder text like "unknown," "not found," "N/A," or an empty string in its place. These fields are typed to accept null, and the code reading your response depends on that being a real null, not a string.

Accuracy:
Never invent specific facts, exact employee counts, exact revenue figures, named individuals, internal systems, technical teams, or business processes beyond what the brief provides. If the brief is thin on usable information, still return the full JSON with your best honest assessment, and explain in researchNotes what was missing and why that limits confidence.

Writing style:
Write summaries, explanations, and notes in plain, clear business English, like a colleague briefing another colleague. Avoid the em dash character. Use a period, comma, or a connecting word instead.
`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    companyName: { type: "string" },
    kvkNumber: { type: ["string", "null"] },
    websiteUrl: { type: ["string", "null"] },
    websiteConfidence: { type: "string", enum: WEBSITE_CONFIDENCE_VALUES },
    industrySubsegment: { type: ["string", "null"] },
    companySummary: { type: "string" },
    estimatedSizeSignal: { type: ["string", "null"] },
    contact: {
      type: "object",
      properties: {
        generalEmail: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
        namedContact: { type: ["string", "null"] },
      },
      required: ["generalEmail", "phone", "namedContact"],
      additionalProperties: false,
    },
    decisionMakerContacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: ["string", "null"] },
          email: { type: ["string", "null"] },
          phone: { type: ["string", "null"] },
          evidenceSource: { type: ["string", "null"] },
        },
        required: ["name", "role", "email", "phone", "evidenceSource"],
        additionalProperties: false,
      },
    },
    websiteFindings: {
      type: "object",
      properties: {
        servicesListed: { type: "array", items: { type: "string" } },
        manualProcessSignals: { type: "array", items: { type: "string" } },
        openVacancies: { type: "array", items: { type: "string" } },
        toolsMentioned: { type: "array", items: { type: "string" } },
      },
      required: ["servicesListed", "manualProcessSignals", "openVacancies", "toolsMentioned"],
      additionalProperties: false,
    },
    automationOpportunities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          opportunity: { type: "string" },
          arisoftService: { type: "string", enum: ARISOFT_SERVICES },
          explanation: { type: "string" },
          evidenceSource: { type: "string" },
          isBestMatch: { type: "boolean" },
        },
        required: ["opportunity", "arisoftService", "explanation", "evidenceSource", "isBestMatch"],
        additionalProperties: false,
      },
    },
    fitScore: { type: "integer" },
    fitScoreReason: { type: "string" },
    outreachAngle: { type: "string" },
    researchNotes: { type: ["string", "null"] },
  },
  required: [
    "companyName",
    "kvkNumber",
    "websiteUrl",
    "websiteConfidence",
    "industrySubsegment",
    "companySummary",
    "estimatedSizeSignal",
    "contact",
    "decisionMakerContacts",
    "websiteFindings",
    "automationOpportunities",
    "fitScore",
    "fitScoreReason",
    "outreachAngle",
    "researchNotes",
  ],
  additionalProperties: false,
} as const;

const FORMAT_ERROR = "The AI returned content in an unexpected format.";

function sanitizeText(value: string): string {
  return value.trim().replace(/\s*—\s*/g, ", ");
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error(FORMAT_ERROR);
  }
  return value as Record<string, unknown>;
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(FORMAT_ERROR);
  }
  return sanitizeText(value);
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(FORMAT_ERROR);
  }
  return sanitizeText(value);
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(FORMAT_ERROR);
  }
  return value.map((item) => {
    if (typeof item !== "string") {
      throw new Error(FORMAT_ERROR);
    }
    return sanitizeText(item);
  });
}

function readEnum<T extends string>(record: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const value = record[key];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(FORMAT_ERROR);
  }
  return value as T;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(FORMAT_ERROR);
  }
  return value;
}

function parseContact(value: unknown): CompanyAnalysisContact {
  const record = readRecord(value);
  return {
    generalEmail: readNullableString(record, "generalEmail"),
    phone: readNullableString(record, "phone"),
    namedContact: readNullableString(record, "namedContact"),
  };
}

function parseDecisionMakerContacts(value: unknown): DecisionMakerContact[] {
  if (!Array.isArray(value)) {
    throw new Error(FORMAT_ERROR);
  }
  return value.map((item) => {
    const record = readRecord(item);
    return {
      name: readRequiredString(record, "name"),
      role: readNullableString(record, "role"),
      email: readNullableString(record, "email"),
      phone: readNullableString(record, "phone"),
      evidenceSource: readNullableString(record, "evidenceSource"),
    };
  });
}

function parseWebsiteFindings(value: unknown): CompanyWebsiteFindings {
  const record = readRecord(value);
  return {
    servicesListed: readStringArray(record, "servicesListed"),
    manualProcessSignals: readStringArray(record, "manualProcessSignals"),
    openVacancies: readStringArray(record, "openVacancies"),
    toolsMentioned: readStringArray(record, "toolsMentioned"),
  };
}

function parseAutomationOpportunities(value: unknown): AutomationOpportunity[] {
  if (!Array.isArray(value)) {
    throw new Error(FORMAT_ERROR);
  }
  return value.map((item) => {
    const record = readRecord(item);
    return {
      opportunity: readRequiredString(record, "opportunity"),
      arisoftService: readEnum(record, "arisoftService", ARISOFT_SERVICES),
      explanation: readRequiredString(record, "explanation"),
      evidenceSource: readRequiredString(record, "evidenceSource"),
      isBestMatch: readBoolean(record, "isBestMatch"),
    };
  });
}

function parseFitScore(record: Record<string, unknown>): number {
  const value = record.fitScore;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(FORMAT_ERROR);
  }
  return Math.min(5, Math.max(1, Math.round(value)));
}

type AnalystOutput = Omit<CompanyAnalysis, "researchBrief">;

async function analyzeResearchBrief(brief: string, input: AnalyzeCompanyInput): Promise<AnalystOutput> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_ANALYST_MODEL || process.env.OPENAI_ANALYZER_MODEL || "gpt-4o";

  const response = await client.responses.create({
    model,
    instructions: ANALYST_SYSTEM_PROMPT,
    input: `Research brief:\n\n${brief}`,
    max_output_tokens: 10000,
    text: {
      format: { type: "json_schema", name: "company_analysis", schema: OUTPUT_SCHEMA, strict: true },
    },
  });

  console.log("[companyAnalyzer] analyzeResearchBrief usage:", {
    company: input.companyName ?? input.kvkNumber ?? "unknown",
    model,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    totalTokens: response.usage?.total_tokens,
  });

  if (response.error) {
    throw new Error("The AI failed to analyze the research. Try again.");
  }

  if (response.incomplete_details?.reason === "content_filter") {
    throw new Error("The AI declined to analyze this research. Try rephrasing the input.");
  }

  if (response.incomplete_details?.reason === "max_output_tokens") {
    throw new Error("The AI ran out of space before finishing the analysis. Try again.");
  }

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("The AI did not return any content.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error(FORMAT_ERROR);
  }

  const record = readRecord(parsed);

  return {
    companyName: readRequiredString(record, "companyName"),
    kvkNumber: readNullableString(record, "kvkNumber"),
    websiteUrl: readNullableString(record, "websiteUrl"),
    websiteConfidence: readEnum(record, "websiteConfidence", WEBSITE_CONFIDENCE_VALUES),
    industrySubsegment: readNullableString(record, "industrySubsegment"),
    companySummary: readRequiredString(record, "companySummary"),
    estimatedSizeSignal: readNullableString(record, "estimatedSizeSignal"),
    contact: parseContact(record.contact),
    decisionMakerContacts: parseDecisionMakerContacts(record.decisionMakerContacts),
    websiteFindings: parseWebsiteFindings(record.websiteFindings),
    automationOpportunities: parseAutomationOpportunities(record.automationOpportunities),
    fitScore: parseFitScore(record),
    fitScoreReason: readRequiredString(record, "fitScoreReason"),
    outreachAngle: readRequiredString(record, "outreachAngle"),
    researchNotes: readNullableString(record, "researchNotes"),
  };
}

// Orchestrates the two-stage pipeline: a Research Agent (web search, no
// judgment) produces a brief, then an Analyst Agent (no tools, reasons only
// over that brief) produces the structured verdict. Callers only ever see
// this function - the signature and return shape match the previous
// single-call version, plus researchBrief, so every existing caller keeps
// working unchanged.
export async function analyzeCompany(input: AnalyzeCompanyInput): Promise<CompanyAnalysis> {
  const brief = await researchCompany(input);
  // Spaces out these two token-heavy calls so their usage doesn't stack in
  // the same rolling TPM window (see src/lib/companyQueue/processing.ts for
  // why this pipeline is prone to bursting an org's tokens-per-minute limit).
  await sleep(Number(process.env.OPENAI_CALL_SPACING_MS) || 6000);
  const analysis = await analyzeResearchBrief(brief, input);
  return { ...analysis, researchBrief: brief };
}
