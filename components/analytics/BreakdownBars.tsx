import type { BreakdownItem } from "@/types/analytics";
import { formatNumber } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/States";

interface BreakdownBarsProps {
  items: BreakdownItem[];
  /** Max rows; the remainder folds into "Other". */
  limit?: number;
  /** Optional per-row tag, e.g. "Latest" next to the current app version. */
  tagFor?: (item: BreakdownItem) => string | null;
  /** Display text for a label, e.g. "note_created" → "Note created". */
  formatLabel?: (label: string) => string;
}

/** Ranked horizontal bars, one hue (magnitude, not identity). Each row is labelled with value + share. */
export function BreakdownBars({ items, limit = 6, tagFor, formatLabel = (label) => label }: BreakdownBarsProps) {
  if (items.length === 0) {
    return <EmptyState title="No data yet" className="py-8" />;
  }

  const sorted = [...items].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const rows = rest.length ? [...head, { label: "Other", count: rest.reduce((s, r) => s + r.count, 0) }] : head;
  const total = sorted.reduce((sum, item) => sum + item.count, 0) || 1;
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const share = (row.count / total) * 100;
        const tag = tagFor?.(row);
        const label = row.label === "Other" && rest.length ? row.label : formatLabel(row.label);
        return (
          <li key={row.label} className="group" title={`${label}: ${formatNumber(row.count)} (${share.toFixed(1)}%)`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-cream-muted">
                <span className="truncate">{label}</span>
                {tag && (
                  <span className="rounded-full border border-accent/25 bg-accent-soft px-1.5 text-[10px] font-medium text-accent">
                    {tag}
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-cream">
                {formatNumber(row.count)}
                <span className="ml-1.5 text-cream-faint">{share.toFixed(1)}%</span>
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-3">
              <div
                className="h-2 rounded-full bg-accent/85 transition-all group-hover:bg-accent"
                style={{ width: `${Math.max(1.5, (row.count / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
