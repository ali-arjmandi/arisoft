import type { QueueItemInput } from "./types";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

export function parseQueueItemInput(value: unknown): ParseResult<QueueItemInput> {
  if (typeof value !== "object" || value === null) {
    return { ok: false, errors: ["Request body must be an object."] };
  }
  const record = value as Record<string, unknown>;
  const errors: string[] = [];

  const companyNameRaw = record.companyName;
  const companyName = typeof companyNameRaw === "string" ? companyNameRaw.trim() : "";
  if (!companyName) errors.push('Field "companyName" is required.');

  const kvkRaw = record.kvkNumber;
  let kvkNumber: string | null = null;
  if (kvkRaw !== null && kvkRaw !== undefined) {
    if (typeof kvkRaw !== "string") {
      errors.push('Field "kvkNumber" must be a string or null.');
    } else {
      kvkNumber = kvkRaw.trim() || null;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: { companyName, kvkNumber } };
}
