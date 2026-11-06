"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReplyForm({ messageId, to, from }: { messageId: string; to: string; from: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch(`/api/dashboard/inbox/${messageId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to send reply.");
      setStatus("success");
      setBody("");
      // Pulls the sent copy into the thread; InboxAutoSync catches it otherwise.
      await fetch("/api/dashboard/inbox/sync", { method: "POST" }).catch(() => undefined);
      router.refresh();
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Failed to send reply.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-dashboard-card border border-border bg-surface p-6 shadow-dashboard-card">
      <p className="text-sm text-body">
        Replying to <span className="font-medium text-foreground">{to}</span> from{" "}
        <span className="font-medium text-foreground">{from}</span>
      </p>
      <label htmlFor="reply" className="sr-only">
        Reply
      </label>
      <textarea
        id="reply"
        required
        rows={8}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          if (status === "success") setStatus("idle");
        }}
        placeholder="Write your reply..."
        className="w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-full bg-blue-gradient border border-primary px-7 py-3 text-sm font-medium text-white transition disabled:opacity-60"
      >
        {status === "submitting" ? "Sending..." : "Send reply"}
      </button>
      {status === "success" && <p className="text-sm font-medium text-emerald-600">Reply sent to {to}.</p>}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}
