import {
  ARISOFT_SERVICES,
  WEBSITE_CONFIDENCE_VALUES,
  type ArisoftService,
  type AutomationOpportunity,
  type CompanyAnalysis,
  type CompanyAnalysisContact,
  type CompanyWebsiteFindings,
  type WebsiteConfidence,
} from "@/lib/companyAnalyzer/analyzeCompany";
import { isValidEmail } from "@/lib/dashboard/validate";
import type { ContactPersonInput } from "./types";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

function readRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function readRequiredString(record: Record<string, unknown>, key: string, errors: string[]): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`Field "${key}" is required.`);
    return "";
  }
  return value.trim();
}

function readNullableString(record: Record<string, unknown>, key: string, errors: string[]): string | null {
  const value = record[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    errors.push(`Field "${key}" must be a string or null.`);
    return null;
  }
  return value.trim() || null;
}

function readStringArray(record: Record<string, unknown>, key: string, errors: string[]): string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    errors.push(`Field "${key}" must be a list.`);
    return [];
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      errors.push(`Field "${key}" must contain only text values.`);
      continue;
    }
    result.push(item);
  }
  return result;
}

function readEnum<T extends string>(
  record: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  errors: string[],
): T {
  const value = record[key];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    errors.push(`Field "${key}" must be one of: ${allowed.join(", ")}.`);
    return allowed[0];
  }
  return value as T;
}

function parseContact(value: unknown, errors: string[]): CompanyAnalysisContact {
  const record = readRecord(value);
  if (!record) {
    errors.push('Field "contact" must be an object.');
    return { generalEmail: null, phone: null, namedContact: null };
  }
  return {
    generalEmail: readNullableString(record, "generalEmail", errors),
    phone: readNullableString(record, "phone", errors),
    namedContact: readNullableString(record, "namedContact", errors),
  };
}

function parseWebsiteFindings(value: unknown, errors: string[]): CompanyWebsiteFindings {
  const record = readRecord(value);
  if (!record) {
    errors.push('Field "websiteFindings" must be an object.');
    return { servicesListed: [], manualProcessSignals: [], openVacancies: [], toolsMentioned: [] };
  }
  return {
    servicesListed: readStringArray(record, "servicesListed", errors),
    manualProcessSignals: readStringArray(record, "manualProcessSignals", errors),
    openVacancies: readStringArray(record, "openVacancies", errors),
    toolsMentioned: readStringArray(record, "toolsMentioned", errors),
  };
}

function parseAutomationOpportunities(value: unknown, errors: string[]): AutomationOpportunity[] {
  if (!Array.isArray(value)) {
    errors.push('Field "automationOpportunities" must be a list.');
    return [];
  }
  return value.map((item) => {
    const record = readRecord(item);
    if (!record) {
      errors.push("Each automation opportunity must be an object.");
      return {
        opportunity: "",
        arisoftService: ARISOFT_SERVICES[0] as ArisoftService,
        explanation: "",
        evidenceSource: "",
      };
    }
    return {
      opportunity: readRequiredString(record, "opportunity", errors),
      arisoftService: readEnum(record, "arisoftService", ARISOFT_SERVICES, errors),
      explanation: readRequiredString(record, "explanation", errors),
      evidenceSource: readRequiredString(record, "evidenceSource", errors),
    };
  });
}

function parseFitScore(record: Record<string, unknown>, errors: string[]): number {
  const value = record.fitScore;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push('Field "fitScore" must be a number.');
    return 1;
  }
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function parseCompanyAnalysisInput(value: unknown): ParseResult<CompanyAnalysis> {
  const record = readRecord(value);
  if (!record) {
    return { ok: false, errors: ["Request body must be an object."] };
  }

  const errors: string[] = [];

  const analysis: CompanyAnalysis = {
    companyName: readRequiredString(record, "companyName", errors),
    kvkNumber: readNullableString(record, "kvkNumber", errors),
    websiteUrl: readNullableString(record, "websiteUrl", errors),
    websiteConfidence: readEnum<WebsiteConfidence>(record, "websiteConfidence", WEBSITE_CONFIDENCE_VALUES, errors),
    industrySubsegment: readNullableString(record, "industrySubsegment", errors),
    companySummary: readRequiredString(record, "companySummary", errors),
    estimatedSizeSignal: readNullableString(record, "estimatedSizeSignal", errors),
    contact: parseContact(record.contact, errors),
    websiteFindings: parseWebsiteFindings(record.websiteFindings, errors),
    automationOpportunities: parseAutomationOpportunities(record.automationOpportunities, errors),
    fitScore: parseFitScore(record, errors),
    fitScoreReason: readRequiredString(record, "fitScoreReason", errors),
    outreachAngle: readRequiredString(record, "outreachAngle", errors),
    researchNotes: readNullableString(record, "researchNotes", errors),
  };

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: analysis };
}

export function parseContactPersonInput(value: unknown): ParseResult<ContactPersonInput> {
  const record = readRecord(value);
  if (!record) {
    return { ok: false, errors: ["Request body must be an object."] };
  }

  const errors: string[] = [];
  const name = readRequiredString(record, "name", errors);
  const role = readNullableString(record, "role", errors);

  const emailRaw = record.email;
  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
  if (!isValidEmail(email)) errors.push("A valid contact email is required.");

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: { name, role, email } };
}
