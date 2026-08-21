"use client";

import { useRef, useState } from "react";
import { parseCompanyQueueCsv, type CsvImportError } from "@/lib/companyQueue/csvImport";
import type { CompanyQueueItemRecord } from "@/lib/companyQueue/types";

export function QueueCsvUpload({ onImported }: { onImported: (items: CompanyQueueItemRecord[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ validCount: number; errors: CsvImportError[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<{ imported: number; skipped: CsvImportError[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(selected: File | null) {
    setFile(selected);
    setSummary(null);
    setError("");
    if (!selected) {
      setPreview(null);
      return;
    }
    const text = await selected.text();
    const { rows, errors } = parseCompanyQueueCsv(text);
    setPreview({ validCount: rows.length, errors });
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/dashboard/queue/import", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to import CSV.");
      }
      onImported(data.imported as CompanyQueueItemRecord[]);
      setSummary({ imported: data.imported.length, skipped: data.skipped });
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import CSV.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="queue-csv" className="text-sm font-medium text-foreground">
          Bulk upload (CSV)
        </label>
        <input
          ref={fileInputRef}
          id="queue-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          className="mt-2 block w-full text-sm text-body file:mr-4 file:rounded-full file:border file:border-primary file:bg-transparent file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-surface-muted"
        />
        <p className="mt-1 text-xs text-muted">
          Needs a header row with a company name column (e.g. &ldquo;company_name&rdquo;) and an optional KVK
          number column (e.g. &ldquo;kvk_number&rdquo;).
        </p>
      </div>

      {preview && (
        <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm">
          <p className="text-body">
            {preview.validCount} row{preview.validCount === 1 ? "" : "s"} ready to add
            {preview.errors.length > 0 && `, ${preview.errors.length} will be skipped`}.
          </p>
          {preview.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {preview.errors.map((rowError, index) => (
                <li key={index}>
                  {rowError.row > 0 ? `Row ${rowError.row}: ` : ""}
                  {rowError.message}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || preview.validCount === 0}
            className="mt-3 rounded-full bg-blue-gradient border border-primary px-5 py-2 text-sm font-medium text-white transition disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload CSV"}
          </button>
        </div>
      )}

      {summary && (
        <p className="text-sm text-body">
          Added {summary.imported} compan{summary.imported === 1 ? "y" : "ies"} to the queue
          {summary.skipped.length > 0 && `, skipped ${summary.skipped.length} row(s)`}.
        </p>
      )}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
