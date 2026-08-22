"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CompanyListItem } from "@/lib/companies/types";
import { usePagination } from "../usePagination";
import { Pagination } from "../Pagination";
import { useSearchFilter } from "../useSearchFilter";
import { SearchInput } from "../SearchInput";
import { useSort, type SortValue } from "../useSort";
import { SortableHeader } from "../SortableHeader";

const ACCESSORS: Record<string, (company: CompanyListItem) => SortValue> = {
  companyName: (company) => company.companyName,
  kvkNumber: (company) => company.kvkNumber,
  contactCount: (company) => company.contactCount,
  emailCount: (company) => company.emailCount,
  viewCount: (company) => company.viewCount,
  downloadCount: (company) => company.downloadCount,
  createdAt: (company) => company.createdAt,
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function CompaniesTable({ companies }: { companies: CompanyListItem[] }) {
  const router = useRouter();
  const getSearchText = useCallback(
    (company: CompanyListItem) => `${company.companyName} ${company.kvkNumber ?? ""}`,
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(companies, getSearchText);
  const { sortKey, direction, toggleSort, sorted } = useSort(filtered, ACCESSORS);
  const { page, setPage, totalPages, pageItems, pageSize } = usePagination(sorted, 10);

  function handleSort(key: string) {
    toggleSort(key);
    setPage(1);
  }

  if (companies.length === 0) {
    return (
      <p className="rounded-dashboard-card border border-border bg-surface p-8 text-center text-sm text-muted">
        No companies saved yet. Analyze one in the Company Analyzer, then save it here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <SearchInput
        value={query}
        onChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder="Search companies..."
      />
      {filtered.length === 0 ? (
        <p className="rounded-dashboard-card border border-border bg-surface p-8 text-center text-sm text-muted">
          No companies match &quot;{query}&quot;.
        </p>
      ) : (
        <div className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                  <SortableHeader
                    label="Company name"
                    sortKey="companyName"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="KVK number"
                    sortKey="kvkNumber"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Contact persons"
                    sortKey="contactCount"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Emails sent"
                    sortKey="emailCount"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Views"
                    sortKey="viewCount"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Downloads"
                    sortKey="downloadCount"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Date added"
                    sortKey="createdAt"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => router.push(`/dashboard/companies/${company.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">{company.companyName}</td>
                    <td className="px-6 py-4 text-body">
                      {company.kvkNumber ?? <span className="text-muted">—</span>}
                    </td>
                    <td className="px-6 py-4 text-body">{company.contactCount}</td>
                    <td className="px-6 py-4 text-body">{company.emailCount}</td>
                    <td className="px-6 py-4 text-body">{company.viewCount}</td>
                    <td className="px-6 py-4 text-body">{company.downloadCount}</td>
                    <td className="px-6 py-4 text-body">{formatDate(company.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={filtered.length}
        pageSize={pageSize}
      />
    </div>
  );
}
