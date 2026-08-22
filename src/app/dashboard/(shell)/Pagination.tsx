"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

const SIBLING_COUNT = 1;

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  const totalNumbers = SIBLING_COUNT * 2 + 5; // first + last + current + 2 siblings + 2 ellipses
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - SIBLING_COUNT, 1);
  const rightSibling = Math.min(current + SIBLING_COUNT, total);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  const pages: (number | "ellipsis")[] = [1];
  if (showLeftEllipsis) pages.push("ellipsis");
  for (let p = Math.max(leftSibling, 2); p <= Math.min(rightSibling, total - 1); p++) {
    pages.push(p);
  }
  if (showRightEllipsis) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);
  const showLabel = totalItems !== undefined && pageSize !== undefined;
  const start = showLabel ? (page - 1) * pageSize! + 1 : 0;
  const end = showLabel ? Math.min(page * pageSize!, totalItems!) : 0;

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {showLabel && (
        <p className="text-xs text-muted">
          Showing {start}–{end} of {totalItems}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-full text-body transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {pages.map((p, index) =>
          p === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-muted">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={
                p === page
                  ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white"
                  : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-body transition hover:bg-surface-muted"
              }
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-full text-body transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
