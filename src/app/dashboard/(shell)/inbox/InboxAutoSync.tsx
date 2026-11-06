"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SYNC_INTERVAL_MS = 30_000;

// Keeps an open inbox live on every environment, including local dev where no
// scheduler calls /api/cron/tick. One sync at a time: the next is only
// scheduled once the previous resolves, not on a fixed interval.
export function InboxAutoSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    async function sync() {
      try {
        if (!document.hidden) {
          const res = await fetch("/api/dashboard/inbox/sync", { method: "POST" });
          const data = await res.json().catch(() => ({}));
          if (data.imported > 0) router.refresh();
        }
      } catch {
        // soft fail — try again next cycle
      } finally {
        if (!cancelled) timeoutId = window.setTimeout(sync, SYNC_INTERVAL_MS);
      }
    }

    void sync();

    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [router]);

  return null;
}
