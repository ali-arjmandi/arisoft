"use client";

import { Fragment, useCallback, useState } from "react";
import Link from "next/link";
import type { CompanyQueueItemRecord } from "@/lib/companyQueue/types";
import { QUEUE_ITEM_STATUSES, type QueueItemStatus } from "@/lib/companyQueue/status";
import { usePagination } from "../usePagination";
import { Pagination } from "../Pagination";
import { Pill, type PillTone } from "../Pill";
import { useSearchFilter } from "../useSearchFilter";
import { useStatusFilter } from "../useStatusFilter";
import { SearchInput } from "../SearchInput";
import { StatusFilter } from "../StatusFilter";
import { useSort, type SortValue } from "../useSort";
import { SortableHeader } from "../SortableHeader";

const STATUS_TONE: Record<QueueItemStatus, PillTone> = {
  waiting: "muted",
  processing: "primary",
  done: "success",
  failed: "danger",
};

const STATUS_LABEL: Record<QueueItemStatus, string> = {
  waiting: "Waiting",
  processing: "Processing",
  done: "Done",
  failed: "Failed",
};

const STATUS_FILTER_OPTIONS: { value: QueueItemStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "processing", label: "Processing" },
  { value: "done", label: "Done" },
  { value: "failed", label: "Failed" },
];

const ACCESSORS: Record<string, (item: CompanyQueueItemRecord) => SortValue> = {
  companyName: (item) => item.companyName,
  kvkNumber: (item) => item.kvkNumber,
  // Lifecycle order, not alphabetical.
  status: (item) => QUEUE_ITEM_STATUSES.indexOf(item.status),
  createdAt: (item) => item.createdAt,
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

export function QueueItemsTable({
  items,
  onDeleted,
  onRetried,
}: {
  items: CompanyQueueItemRecord[];
  onDeleted: (id: string) => void;
  onRetried: (item: CompanyQueueItemRecord) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const getSearchText = useCallback(
    (item: CompanyQueueItemRecord) => `${item.companyName} ${item.kvkNumber ?? ""}`,
    [],
  );
  const getStatus = useCallback((item: CompanyQueueItemRecord) => item.status, []);
  const { query, setQuery, filtered: searched } = useSearchFilter(items, getSearchText);
  const { status, setStatus, filtered } = useStatusFilter(searched, getStatus);
  const { sortKey, direction, toggleSort, sorted } = useSort(filtered, ACCESSORS);
  const { page, setPage, totalPages, pageItems, pageSize } = usePagination(sorted, 10);

  function handleSort(key: string) {
    toggleSort(key);
    setPage(1);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this company from the queue?")) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/queue/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to delete item.");
      }
      onDeleted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRetry(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/queue/${id}/retry`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to retry item.");
      }
      onRetried(data.item as CompanyQueueItemRecord);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry item.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-dashboard-card border border-border bg-surface p-8 text-center text-sm text-muted">
        The queue is empty. Add a company above, or upload a CSV.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Search queue..."
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
        <p className="rounded-dashboard-card border border-border bg-surface p-8 text-center text-sm text-muted">
          No queue items match your search or filter.
        </p>
      ) : (
        <div className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
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
                    label="Status"
                    sortKey="status"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Added"
                    sortKey="createdAt"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <Fragment key={item.id}>
                    <tr className="border-b border-border last:border-0 hover:bg-surface-muted">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {item.companyId ? (
                          <Link href={`/dashboard/companies/${item.companyId}`} className="hover:underline">
                            {item.companyName}
                          </Link>
                        ) : (
                          item.companyName
                        )}
                      </td>
                      <td className="px-6 py-4 text-body">
                        {item.kvkNumber ?? <span className="text-muted">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <Pill tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Pill>
                      </td>
                      <td className="px-6 py-4 text-body">{formatDate(item.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3 text-xs font-medium">
                          {item.status === "failed" && (
                            <button
                              type="button"
                              onClick={() => handleRetry(item.id)}
                              disabled={busyId === item.id}
                              className="text-primary hover:underline disabled:opacity-60"
                            >
                              Retry
                            </button>
                          )}
                          {(item.status === "waiting" || item.status === "failed") && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              disabled={busyId === item.id}
                              className="text-red-600 hover:underline disabled:opacity-60"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {item.status === "failed" && item.errorMessage && (
                      <tr className="border-b border-border bg-danger-tint last:border-0">
                        <td colSpan={5} className="px-6 py-2 text-xs text-danger">
                          {item.errorMessage}
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
