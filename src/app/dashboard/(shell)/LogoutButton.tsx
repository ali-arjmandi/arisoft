"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoutIcon } from "./icons";

export function LogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/dashboard/logout", { method: "POST" });
    router.push("/dashboard/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-body transition hover:bg-surface-muted disabled:opacity-60"
    >
      <LogoutIcon className="h-4 w-4" />
      {loggingOut ? "Signing out..." : "Log out"}
    </button>
  );
}
