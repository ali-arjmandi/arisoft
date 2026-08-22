"use client";

export function StatusFilter<S extends string>({
  value,
  onChange,
  options,
}: {
  value: S | "all";
  onChange: (value: S | "all") => void;
  options: { value: S | "all"; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={
            value === option.value
              ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-white"
              : "rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-muted transition hover:text-body"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
