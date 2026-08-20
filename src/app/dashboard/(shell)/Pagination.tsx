"use client";

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-body transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-xs text-muted">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-body transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
