import { useMemo, useState } from "react";

export function useSearchFilter<T>(items: T[], getSearchText: (item: T) => string) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => getSearchText(item).toLowerCase().includes(q));
  }, [items, query, getSearchText]);

  return { query, setQuery, filtered };
}
