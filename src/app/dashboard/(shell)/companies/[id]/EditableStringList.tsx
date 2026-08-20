"use client";

import { useState } from "react";

export function EditableStringList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDraft("");
      setAdding(false);
    }
  }

  function handleBlur() {
    commitDraft();
    setAdding(false);
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>

      {items.length === 0 && !adding ? (
        <p className="mt-1.5 text-sm text-muted">
          None found ·{" "}
          <button type="button" onClick={() => setAdding(true)} className="font-medium text-primary hover:underline">
            + Add
          </button>
        </p>
      ) : (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {items.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted py-1 pl-3 pr-1.5 text-xs text-foreground"
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label={`Remove ${item}`}
                className="rounded-full px-1 text-muted hover:bg-border hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}

          {adding ? (
            <input
              type="text"
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder="Add item"
              className="w-36 rounded-full border border-[#AAAAAA] px-3 py-1 text-xs placeholder-[#888] outline-none transition-colors focus:border-primary"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-primary hover:bg-surface-muted"
            >
              + Add
            </button>
          )}
        </div>
      )}
    </div>
  );
}
