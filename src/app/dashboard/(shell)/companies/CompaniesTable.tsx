"use client";

import Link from "next/link";
import type { CompanyListItem } from "@/lib/companies/types";
import { usePagination } from "../usePagination";
import { Pagination } from "../Pagination";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function CompaniesTable({ companies }: { companies: CompanyListItem[] }) {
  const { page, setPage, totalPages, pageItems } = usePagination(companies, 10);

  if (companies.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
        No companies saved yet. Analyze one in the Company Analyzer, then save it here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-6 py-3">Company name</th>
              <th className="px-6 py-3">KVK number</th>
              <th className="px-6 py-3">Emails sent</th>
              <th className="px-6 py-3">Date added</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((company) => (
              <Link key={company.id} href={`/dashboard/companies/${company.id}`} className="contents">
                <tr className="border-b border-border last:border-0 hover:bg-surface-muted">
                  <td className="px-6 py-4 font-medium text-foreground">{company.companyName}</td>
                  <td className="px-6 py-4 text-body">{company.kvkNumber ?? <span className="text-muted">—</span>}</td>
                  <td className="px-6 py-4 text-body">{company.emailCount}</td>
                  <td className="px-6 py-4 text-body">{formatDate(company.createdAt)}</td>
                </tr>
              </Link>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
