"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/panel/logout", { method: "POST" });
    router.push("/panel");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="rounded-full border border-border px-4 py-2 text-sm font-medium text-body transition hover:bg-surface-muted disabled:opacity-60"
    >
      {loggingOut ? "Signing out..." : "Log out"}
    </button>
  );
}
