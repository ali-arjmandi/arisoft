import Papa from "papaparse";
import type { QueueItemInput } from "./types";

export interface CsvImportError {
  row: number;
  message: string;
}

export interface CsvImportResult {
  rows: QueueItemInput[];
  errors: CsvImportError[];
}

const COMPANY_NAME_HEADERS = ["company_name", "companyname", "company name", "company", "name"];
const KVK_HEADERS = ["kvk_number", "kvknumber", "kvk number", "kvk", "kvk_nr", "kvknr"];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function findColumn(headers: string[], candidates: string[]): string | null {
  const normalized = headers.map((header) => ({ original: header, normalized: normalizeHeader(header) }));
  for (const candidate of candidates) {
    const match = normalized.find((header) => header.normalized === candidate);
    if (match) return match.original;
  }
  return null;
}

// Shared by the client (fast feedback before upload) and the server (source
// of truth on import) — same pattern as src/lib/email/attachments.ts.
export function parseCompanyQueueCsv(csvText: string): CsvImportResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const headers = parsed.meta.fields ?? [];
  const companyNameColumn = findColumn(headers, COMPANY_NAME_HEADERS);
  const kvkColumn = findColumn(headers, KVK_HEADERS);

  if (!companyNameColumn) {
    return {
      rows: [],
      errors: [
        { row: 0, message: 'No company name column found. Expected a header like "company_name" or "name".' },
      ],
    };
  }

  const rows: QueueItemInput[] = [];
  const errors: CsvImportError[] = [];

  parsed.data.forEach((record, index) => {
    const rowNumber = index + 2; // header is row 1, data starts at row 2
    const companyName = (record[companyNameColumn] ?? "").trim();
    const kvkNumber = kvkColumn ? (record[kvkColumn] ?? "").trim() || null : null;

    if (!companyName) {
      errors.push({ row: rowNumber, message: "Missing company name." });
      return;
    }

    rows.push({ companyName, kvkNumber });
  });

  return { rows, errors };
}
