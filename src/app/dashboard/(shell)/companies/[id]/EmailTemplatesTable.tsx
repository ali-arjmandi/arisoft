"use client";

import { Fragment, useCallback, useState } from "react";
import Link from "next/link";
import type { EmailRecord } from "@/lib/companies/types";
import { usePagination } from "../../usePagination";
import { Pagination } from "../../Pagination";
import { useSearchFilter } from "../../useSearchFilter";
import { SearchInput } from "../../SearchInput";
import { useSort, type SortValue } from "../../useSort";
import { SortableHeader } from "../../SortableHeader";

const ACCESSORS: Record<string, (template: EmailRecord) => SortValue> = {
  fromSender: (template) => template.fromSender,
  createdAt: (template) => template.createdAt,
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}

// Drafts are treated as reusable templates: editing one (via "Edit", which
// opens the compose page pre-filled but with the receiver left blank) or
// generating a new one never mutates a row here — Send/Queue on the compose
// page always create a separate email. See src/lib/companies/emails.ts.
export function EmailTemplatesTable({
  companyId,
  initialTemplates,
}: {
  companyId: string;
  initialTemplates: EmailRecord[];
}) {
  const [templates, setTemplates] = useState<EmailRecord[]>(initialTemplates);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const getSearchText = useCallback(
    (template: EmailRecord) => `${template.fromSender} ${template.content.subject}`,
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(templates, getSearchText);
  const { sortKey, direction, toggleSort, sorted } = useSort(filtered, ACCESSORS);
  const { page, setPage, totalPages, pageItems, pageSize } = usePagination(sorted, 10);

  function handleSort(key: string) {
    toggleSort(key);
    setPage(1);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/companies/${companyId}/generate-email`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate email.");
      }
      setTemplates((prev) => [data.item, ...prev]);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate email.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Discard this template? This can't be undone.")) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/email-queue/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to discard template.");
      }
      setTemplates((prev) => prev.filter((template) => template.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard template.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4 rounded-dashboard-card border border-border bg-surface p-8 shadow-dashboard-card">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Email templates</h2>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-surface-muted disabled:opacity-60"
        >
          {generating ? "Generating..." : "Generate email"}
        </button>
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {templates.length === 0 ? (
        <p className="text-sm text-muted">No email templates for this company yet.</p>
      ) : (
        <>
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search templates..."
          />
          {filtered.length === 0 ? (
            <p className="text-sm text-muted">No templates match &quot;{query}&quot;.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted text-xs font-medium uppercase tracking-wide text-muted">
                      <SortableHeader
                        label="From"
                        sortKey="fromSender"
                        activeKey={sortKey}
                        direction={direction}
                        onSort={handleSort}
                        className="px-4 py-3"
                      />
                      <SortableHeader
                        label="Created"
                        sortKey="createdAt"
                        activeKey={sortKey}
                        direction={direction}
                        onSort={handleSort}
                        className="px-4 py-3"
                      />
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((template) => {
                      const expanded = expandedId === template.id;
                      const busy = busyId === template.id;
                      return (
                        <Fragment key={template.id}>
                          <tr
                            onClick={() => setExpandedId(expanded ? null : template.id)}
                            className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted"
                          >
                            <td className="px-4 py-3 text-body">{template.fromSender}</td>
                            <td className="px-4 py-3 text-body">{formatDate(template.createdAt)}</td>
                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <div className="flex gap-3 text-xs font-medium">
                                <Link
                                  href={`/dashboard/email?templateId=${template.id}`}
                                  target="_blank"
                                  className="text-primary hover:underline"
                                >
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(template.id)}
                                  disabled={busy}
                                  className="text-red-600 hover:underline disabled:opacity-60"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="border-b border-border bg-surface-muted last:border-0">
                              <td colSpan={3} className="px-4 py-4">
                                <dl className="space-y-3">
                                  <DetailField label="Subject" value={template.content.subject} />
                                  {template.content.preheader && (
                                    <DetailField label="Preheader" value={template.content.preheader} />
                                  )}
                                  {template.content.heading && (
                                    <DetailField label="Heading" value={template.content.heading} />
                                  )}
                                  <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">Body</dt>
                                    {/* Read-only replay of content generated by our own AI flow or composed
                                        by an admin — same trust level as anything else already stored in
                                        emails, not arbitrary external input. */}
                                    <dd
                                      className="mt-1 text-sm text-foreground [&_a]:text-primary [&_a]:underline"
                                      dangerouslySetInnerHTML={{ __html: template.content.body }}
                                    />
                                  </div>
                                </dl>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-border px-4 py-3">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={filtered.length}
                  pageSize={pageSize}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
