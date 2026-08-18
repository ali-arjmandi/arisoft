"use client";

import { useEffect, useState } from "react";
import type { GeneratedEmailContent } from "@/lib/email/generateContent";

type Status = "idle" | "generating" | "error";

interface GenerateWithAiModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (content: GeneratedEmailContent) => void;
}

export function GenerateWithAiModal({ open, onClose, onGenerated }: GenerateWithAiModalProps) {
  const [brief, setBrief] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  function resetAndClose() {
    setBrief("");
    setStatus("idle");
    setError("");
    onClose();
  }

  function handleClose() {
    if (status !== "generating") resetAndClose();
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleClose reads current status via closure
  }, [open, status]);

  if (!open) return null;

  async function handleGenerate() {
    if (!brief.trim()) {
      setStatus("error");
      setError("Please describe the email you want.");
      return;
    }

    setStatus("generating");
    setError("");

    try {
      const res = await fetch("/api/panel/generate-email-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate email content.");
      }

      onGenerated(data.content as GeneratedEmailContent);
      resetAndClose();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to generate email content.");
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Generate email content with AI"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Generate with AI</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-muted hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-sm text-muted">
          Describe the email you want. The AI will fill in the subject, preheader, heading, and body for
          you.
        </p>

        <textarea
          autoFocus
          rows={5}
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          disabled={status === "generating"}
          placeholder="e.g. Announce our new AI onboarding automation feature to existing customers"
          className="mt-4 w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
        />

        {status === "error" && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={status === "generating"}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={status === "generating"}
            className="rounded-full bg-blue-gradient border border-primary px-5 py-2.5 text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50 disabled:opacity-60"
          >
            {status === "generating" ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
