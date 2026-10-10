"use client";

import { cn } from "@/lib/utils/cn";

interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export function SegmentedControl<T extends string | number>({ options, value, onChange, label }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "focus-ring rounded-lg px-3 py-1 text-xs font-medium transition",
              active ? "bg-surface-3 text-cream shadow-sm" : "text-cream-faint hover:text-cream",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
