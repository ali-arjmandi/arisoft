"use client";

import { Fragment, useCallback, useState } from "react";
import type { EmailRecord } from "@/lib/companies/types";
import { EMAIL_STATUSES, type EmailStatus } from "@/lib/email/status";
import { usePagination } from "../../usePagination";
import { Pagination } from "../../Pagination";
import { Pill, type PillTone } from "../../Pill";
import { useSearchFilter } from "../../useSearchFilter";
import { useStatusFilter } from "../../useStatusFilter";
import { SearchInput } from "../../SearchInput";
import { StatusFilter } from "../../StatusFilter";
import { useSort, type SortValue } from "../../useSort";
import { SortableHeader } from "../../SortableHeader";

const STATUS_TONE: Record<EmailStatus, PillTone> = {
  draft: "muted",
  queued: "warning",
  sent: "success",
};

const STATUS_LABEL: Record<EmailStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  sent: "Sent",
};

const STATUS_FILTER_OPTIONS: { value: EmailStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
];

const ACCESSORS: Record<string, (email: EmailRecord) => SortValue> = {
  contact: (email) => email.contactNameSnapshot ?? email.contactEmailSnapshot,
  fromSender: (email) => email.fromSender,
  // Lifecycle order, not alphabetical.
  status: (email) => EMAIL_STATUSES.indexOf(email.status),
  // Mirrors exactly what the Date column displays.
  date: (email) => (email.status === "sent" ? email.sentAt : null),
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

export function EmailsTable({ initialEmails }: { initialEmails: EmailRecord[] }) {
  const [emails, setEmails] = useState<EmailRecord[]>(initialEmails);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const getSearchText = useCallback(
    (email: EmailRecord) =>
      `${email.contactNameSnapshot ?? ""} ${email.contactEmailSnapshot} ${email.fromSender} ${email.content.subject}`,
    [],
  );
  const getStatus = useCallback((email: EmailRecord) => email.status, []);
  const { query, setQuery, filtered: searched } = useSearchFilter(emails, getSearchText);
  const { status, setStatus, filtered } = useStatusFilter(searched, getStatus);
  const { sortKey, direction, toggleSort, sorted } = useSort(filtered, ACCESSORS);
  const { page, setPage, totalPages, pageItems, pageSize } = usePagination(sorted, 10);

  function handleSort(key: string) {
    toggleSort(key);
    setPage(1);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Discard this email? This can't be undone.")) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/email-queue/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to discard email.");
      }
      setEmails((prev) => prev.filter((email) => email.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard email.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4 rounded-dashboard-card border border-border bg-surface p-8 shadow-dashboard-card">
      <h2 className="text-lg font-semibold text-foreground">Queued &amp; sent emails</h2>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {emails.length === 0 ? (
        <p className="text-sm text-muted">No queued or sent emails for this company yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Search emails..."
            />
            <StatusFilter
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted">No emails match your search or filter.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted text-xs font-medium uppercase tracking-wide text-muted">
                      <SortableHeader
                        label="Contact person"
                        sortKey="contact"
                        activeKey={sortKey}
                        direction={direction}
                        onSort={handleSort}
                        className="px-4 py-3"
                      />
                      <SortableHeader
                        label="From"
                        sortKey="fromSender"
                        activeKey={sortKey}
                        direction={direction}
                        onSort={handleSort}
                        className="px-4 py-3"
                      />
                      <SortableHeader
                        label="Status"
                        sortKey="status"
                        activeKey={sortKey}
                        direction={direction}
                        onSort={handleSort}
                        className="px-4 py-3"
                      />
                      <SortableHeader
                        label="Date"
                        sortKey="date"
                        activeKey={sortKey}
                        direction={direction}
                        onSort={handleSort}
                        className="px-4 py-3"
                      />
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((email) => {
                      const expanded = expandedId === email.id;
                      const busy = busyId === email.id;
                      return (
                        <Fragment key={email.id}>
                          <tr
                            onClick={() => setExpandedId(expanded ? null : email.id)}
                            className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted"
                          >
                            <td className="px-4 py-3 text-foreground">
                              {email.contactNameSnapshot ?? email.contactEmailSnapshot}
                            </td>
                            <td className="px-4 py-3 text-body">{email.fromSender}</td>
                            <td className="px-4 py-3">
                              <Pill tone={STATUS_TONE[email.status]}>{STATUS_LABEL[email.status]}</Pill>
                            </td>
                            <td className="px-4 py-3 text-body">
                              {email.status === "sent" && email.sentAt ? formatDate(email.sentAt) : "—"}
                            </td>
                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <div className="flex gap-3 text-xs font-medium">
                                {email.status !== "sent" && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(email.id)}
                                    disabled={busy}
                                    className="text-red-600 hover:underline disabled:opacity-60"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="border-b border-border bg-surface-muted last:border-0">
                              <td colSpan={5} className="px-4 py-4">
                                <dl className="space-y-3">
                                  <DetailField label="To" value={email.contactEmailSnapshot} />
                                  <DetailField label="Subject" value={email.content.subject} />
                                  {email.content.preheader && (
                                    <DetailField label="Preheader" value={email.content.preheader} />
                                  )}
                                  {email.content.heading && (
                                    <DetailField label="Heading" value={email.content.heading} />
                                  )}
                                  <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">Body</dt>
                                    {/* Read-only replay of content that either already went out over SMTP
                                        from this dashboard, or was generated by the company queue — same
                                        trust level as the original send/generation, not arbitrary external
                                        input. */}
                                    <dd
                                      className="mt-1 text-sm text-foreground [&_a]:text-primary [&_a]:underline"
                                      dangerouslySetInnerHTML={{ __html: email.content.body }}
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
