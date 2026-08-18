import OpenAI from "openai";

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
  websiteFindings: CompanyWebsiteFindings;
  automationOpportunities: AutomationOpportunity[];
  fitScore: number;
  fitScoreReason: string;
  outreachAngle: string;
  researchNotes: string | null;
}

export interface AnalyzeCompanyInput {
  companyName: string | null;
  kvkNumber: string | null;
}

const WEBSITE_CONFIDENCE_VALUES: WebsiteConfidence[] = ["high", "medium", "low", "not_found"];

const ARISOFT_SERVICES: ArisoftService[] = [
  "Customer support automation",
  "Internal workflow automation",
  "Lead intake and qualification",
  "Company knowledge assistant",
  "Safe AI access to internal systems",
  "Private, on-premise AI",
];

const SYSTEM_PROMPT = `You are a lead research analyst for Arisoft, an AI automation agency based in Delft, Netherlands.

About Arisoft:
Arisoft builds tailored AI automation for small and medium businesses, connecting the tools a company already uses so repetitive manual work happens without anyone touching it. Every solution is built around how the specific business actually operates, not a generic chatbot.

Arisoft's services:
1. Customer support automation: an AI assistant trained on the company's own docs and FAQs, answers routine questions, escalates only what a human needs to see.
2. Internal workflow automation: connects existing tools (email, calendar, CRM, invoicing, Slack, Telegram, WhatsApp) so data entry, follow-ups, and reporting happen automatically.
3. Lead intake and qualification: automatically researches, scores, and responds to inbound leads before a human looks at them.
4. Company knowledge assistant: lets staff ask plain-English questions and get answers pulled from internal documents and databases.
5. Safe AI access to internal systems: securely connects AI assistants to a company's own tools and data without exposing sensitive information.
6. Private, on-premise AI: for businesses where data privacy is non-negotiable, the entire AI stack runs on the client's own infrastructure.

Arisoft's current ideal client profile is small-to-mid Dutch and EU logistics and transport companies with manual, repetitive coordination work such as order entry, status updates, dispatch coordination, POD-to-invoice matching, and customer communication. You can still analyze companies outside this profile; note it in researchNotes if that looks like a weaker fit for this reason.

Your task:
You will be given the name and/or KVK number of one company. Do deep, genuine research on it using web search, then return one structured analysis of where Arisoft could help.

How to research — work through all of these steps, not just whichever one gives you a quick answer first:
1. Identify the company precisely. If a KVK number was given, use it to confirm you have the right company. If no KVK number was given, search for it (for example via the official KVK register at kvk.nl, or a registration number listed on the company's own site) and include it if you find it with reasonable confidence; otherwise leave it null. Do not confuse a similarly named company for the one you were actually asked about, especially if the name is generic or common.
2. Find the company's own official website, not a directory listing, a KVK profile page, or a LinkedIn page. If your first search does not turn up a confident match, refine the query and search again (try the company name plus city, plus "kvk", plus the industry you suspect) before giving up. Only set websiteUrl to null and websiteConfidence to "not_found" after you have genuinely tried more than one search angle.
3. Once you have the website, do not stop at the homepage. Browse the pages that actually matter: about/history, services or products, contact, careers/vacancies, and any customer-facing tools (quote forms, portals, tracking pages). Read enough of each page to form a real opinion, not just skim the titles.
4. Look beyond the company's own site too. Search for news mentions, reviews, LinkedIn presence, and industry directory listings to cross-check what the website claims and to fill in gaps the website does not cover (size, founding year, recent developments). If something looks ambiguous or off, search again to confirm or correct it rather than reporting a guess as fact.
5. From all of that, note: services offered, concrete signs of manual processes (quote-request forms instead of live tracking, PDF-only downloads, phone-only contact, no customer portal), open vacancies (especially "logistics coordinator," "planner/dispatcher," "customer service," "administratie" — these usually signal manual bottlenecks), any named tools or software mentioned, contact details, and size signals (employee count, fleet size, number of locations, founding year).

Reasoning, not template-filling:
This is an analysis, not a form to fill in with plausible-sounding text. For every judgment you make (industry subsegment, size signal, each automation opportunity, the fit score), you must be able to point to something specific you actually found during research. Before you finalize the automation opportunities, weigh the evidence: does what you found actually indicate this specific company has this specific manual process, or is this an opportunity you would write for any company in this industry regardless of evidence? If you cannot back an opportunity with a specific fact from your research, either drop it or say plainly in researchNotes that it is a plausible but unconfirmed guess. One to three well-evidenced opportunities beats three generic ones, and it is fine to return fewer than three if that is all the evidence supports. Map each opportunity to exactly one of Arisoft's six services above.

Fit score:
Score the fit from 1 (little to no evidence of a real opportunity) to 5 (strong, specific, well-evidenced opportunity), with one sentence explaining the score. The score should track how confident and specific your evidence is, not how much information you found in general.

Missing information:
When you cannot find a specific piece of information after genuinely trying, return null for that field. Never use placeholder text like "unknown," "not found," "N/A," or an empty string in its place — these fields are typed to accept null, and the code reading your response depends on that being a real null, not a string.

Accuracy:
Never invent specific facts, exact employee counts, exact revenue figures, or named individuals that you did not actually find. If web research turns up nothing usable after a genuine effort, still return the full JSON with your best honest assessment, and explain in researchNotes what you tried and why it did not work.

Writing style:
Write summaries, explanations, and notes in plain, clear business English, like a colleague briefing another colleague. Avoid the em dash character (—); use a period, comma, or a connecting word instead.`;

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
        },
        required: ["opportunity", "arisoftService", "explanation", "evidenceSource"],
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

function parseContact(value: unknown): CompanyAnalysisContact {
  const record = readRecord(value);
  return {
    generalEmail: readNullableString(record, "generalEmail"),
    phone: readNullableString(record, "phone"),
    namedContact: readNullableString(record, "namedContact"),
  };
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

export async function analyzeCompany(input: AnalyzeCompanyInput): Promise<CompanyAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_ANALYZER_MODEL || "gpt-4o";

  const response = await client.responses.create({
    model,
    instructions: SYSTEM_PROMPT,
    input: `<company>\nName: ${input.companyName ?? "not provided"}\nKVK number: ${input.kvkNumber ?? "not provided"}\n</company>`,
    tools: [{ type: "web_search" }],
    max_output_tokens: 8192,
    text: {
      format: { type: "json_schema", name: "company_analysis", schema: OUTPUT_SCHEMA, strict: true },
    },
  });

  if (response.error) {
    throw new Error("The AI failed to research this company. Try again.");
  }

  if (response.incomplete_details?.reason === "content_filter") {
    throw new Error("The AI declined to research this company. Try rephrasing the input.");
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
    websiteFindings: parseWebsiteFindings(record.websiteFindings),
    automationOpportunities: parseAutomationOpportunities(record.automationOpportunities),
    fitScore: parseFitScore(record),
    fitScoreReason: readRequiredString(record, "fitScoreReason"),
    outreachAngle: readRequiredString(record, "outreachAngle"),
    researchNotes: readNullableString(record, "researchNotes"),
  };
}
