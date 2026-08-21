"use client";

import { Fragment, useState } from "react";
import type { EmailRecord } from "@/lib/companies/types";
import type { EmailStatus } from "@/lib/email/status";
import { usePagination } from "../../usePagination";
import { Pagination } from "../../Pagination";
import { Pill, type PillTone } from "../../Pill";

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

export function EmailsTable({ companyId, initialEmails }: { companyId: string; initialEmails: EmailRecord[] }) {
  const [emails, setEmails] = useState<EmailRecord[]>(initialEmails);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { page, setPage, totalPages, pageItems } = usePagination(emails, 10);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/companies/${companyId}/generate-email`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate email.");
      }
      setEmails((prev) => [data.item, ...prev]);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate email.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleQueue(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/emails/${id}/queue`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to queue email.");
      }
      setEmails((prev) => prev.map((email) => (email.id === id ? data.item : email)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue email.");
    } finally {
      setBusyId(null);
    }
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
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Emails</h2>
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

      {emails.length === 0 ? (
        <p className="text-sm text-muted">No emails for this company yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Contact person</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
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
                          {email.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => handleQueue(email.id)}
                              disabled={busy}
                              className="text-primary hover:underline disabled:opacity-60"
                            >
                              Queue
                            </button>
                          )}
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
                            {email.content.preheader && <DetailField label="Preheader" value={email.content.preheader} />}
                            {email.content.heading && <DetailField label="Heading" value={email.content.heading} />}
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
          <div className="border-t border-border px-4 py-3">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
