import type { ComponentType, SVGProps } from "react";

type Tone = "primary" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
  hint,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string | number;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-dashboard-card border border-border bg-surface p-6 shadow-dashboard-card">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}
