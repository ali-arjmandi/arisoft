"use client";

import type { ReactNode } from "react";
import { ChevronDownIcon, ChevronUpIcon, SortIcon } from "./icons";
import type { SortDirection } from "./useSort";

export function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className = "px-6 py-3",
}: {
  label: ReactNode;
  sortKey: string;
  activeKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 whitespace-nowrap transition hover:text-body"
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ChevronUpIcon className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5 text-primary" />
          )
        ) : (
          <SortIcon className="h-3.5 w-3.5 text-muted/50" />
        )}
      </button>
    </th>
  );
}
