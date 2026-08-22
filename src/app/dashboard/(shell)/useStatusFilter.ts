import { useMemo, useState } from "react";

export function useStatusFilter<T, S extends string>(items: T[], getStatus: (item: T) => S) {
  const [status, setStatus] = useState<S | "all">("all");

  const filtered = useMemo(
    () => (status === "all" ? items : items.filter((item) => getStatus(item) === status)),
    [items, status, getStatus],
  );

  return { status, setStatus, filtered };
}
