import type { ReactNode } from "react";

export type PillTone = "primary" | "success" | "warning" | "danger" | "muted";

const TONE_CLASSES: Record<PillTone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  muted: "bg-surface-muted text-muted",
};

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
