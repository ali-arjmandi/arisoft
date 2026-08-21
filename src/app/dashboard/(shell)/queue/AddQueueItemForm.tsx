"use client";

import { useState } from "react";
import type { CompanyQueueItemRecord } from "@/lib/companyQueue/types";

const inputClassName =
  "w-full rounded-lg border border-[#AAAAAA] px-3 py-2 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary";

export function AddQueueItemForm({ onAdded }: { onAdded: (item: CompanyQueueItemRecord) => void }) {
  const [companyName, setCompanyName] = useState("");
  const [kvkNumber, setKvkNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, kvkNumber: kvkNumber.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to add company.");
      }
      onAdded(data.item as CompanyQueueItemRecord);
      setCompanyName("");
      setKvkNumber("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add company.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto]">
      <input
        type="text"
        placeholder="Company name"
        value={companyName}
        onChange={(event) => setCompanyName(event.target.value)}
        disabled={saving}
        className={inputClassName}
      />
      <input
        type="text"
        placeholder="KVK number (optional)"
        value={kvkNumber}
        onChange={(event) => setKvkNumber(event.target.value)}
        disabled={saving}
        className={inputClassName}
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-blue-gradient border border-primary px-5 py-2 text-sm font-medium text-white transition disabled:opacity-60"
      >
        {saving ? "Adding..." : "Add to queue"}
      </button>
      {error && <p className="text-sm font-medium text-red-600 sm:col-span-3">{error}</p>}
    </form>
  );
}
