"use client";

import { Fragment, useState } from "react";
import type { EmailSentRecord } from "@/lib/companies/types";
import { usePagination } from "../../usePagination";
import { Pagination } from "../../Pagination";

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

export function EmailsSentTable({ emails }: { emails: EmailSentRecord[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { page, setPage, totalPages, pageItems } = usePagination(emails, 10);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Emails sent</h2>

      {emails.length === 0 ? (
        <p className="text-sm text-muted">No emails sent to this company yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Contact person</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((email) => {
                const expanded = expandedId === email.id;
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
                      <td className="px-4 py-3 text-body">{formatDate(email.sentAt)}</td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-border bg-surface-muted last:border-0">
                        <td colSpan={3} className="px-4 py-4">
                          <dl className="space-y-3">
                            <DetailField label="To" value={email.contactEmailSnapshot} />
                            <DetailField label="Subject" value={email.content.subject} />
                            {email.content.preheader && <DetailField label="Preheader" value={email.content.preheader} />}
                            {email.content.heading && <DetailField label="Heading" value={email.content.heading} />}
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Body</dt>
                              {/* Read-only replay of content that already went out over SMTP from
                                  this dashboard — same trust level as the original send, not arbitrary
                                  external input. */}
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
