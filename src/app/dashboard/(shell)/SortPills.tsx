"use client";

import { ChevronDownIcon, ChevronUpIcon, SortIcon } from "./icons";
import type { SortDirection } from "./useSort";

export function SortPills({
  options,
  activeKey,
  direction,
  onSort,
}: {
  options: { value: string; label: string }[];
  activeKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">Sort by</span>
      {options.map((option) => {
        const active = activeKey === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSort(option.value)}
            className={
              active
                ? "flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white"
                : "flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-muted transition hover:text-body"
            }
          >
            {option.label}
            {active ? (
              direction === "asc" ? (
                <ChevronUpIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              )
            ) : (
              <SortIcon className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        );
      })}
    </div>
  );
}
