"use client";

import { SearchIcon } from "./icons";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full bg-surface-muted py-2 pl-10 pr-4 text-sm text-body outline-none transition placeholder:text-muted focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}
