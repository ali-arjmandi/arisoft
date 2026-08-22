import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";
export type SortValue = string | number | Date | null;

function compareValues(a: SortValue, b: SortValue, direction: SortDirection): number {
  if (a === null || b === null) {
    if (a === null && b === null) return 0;
    // Nulls always sort last, regardless of direction.
    return a === null ? 1 : -1;
  }

  const cmp =
    a instanceof Date && b instanceof Date
      ? a.getTime() - b.getTime()
      : typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

  return direction === "asc" ? cmp : -cmp;
}

export function useSort<T>(items: T[], accessors: Record<string, (item: T) => SortValue>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<SortDirection>("asc");

  function toggleSort(key: string) {
    if (sortKey === key) {
      setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return items;
    const accessor = accessors[sortKey];
    // Clone before sorting — useSearchFilter/useStatusFilter can hand back
    // the same array reference as the caller's own state/prop when no
    // query/filter is active, and Array.prototype.sort mutates in place.
    return [...items].sort((a, b) => compareValues(accessor(a), accessor(b), direction));
  }, [items, sortKey, direction, accessors]);

  return { sortKey, direction, toggleSort, sorted };
}
