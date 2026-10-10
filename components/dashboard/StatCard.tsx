import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { MetricValue } from "@/types/analytics";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils/cn";
import { formatCompact, formatPercent } from "@/lib/utils/format";

interface StatCardProps {
  label: string;
  metric?: MetricValue;
  icon: ReactNode;
  /** e.g. "vs previous 30 days" */
  comparison?: string;
  loading?: boolean;
}

export function StatCard({ label, metric, icon, comparison, loading }: StatCardProps) {
  const change = metric?.change_pct;
  const up = change != null && change >= 0;

  return (
    <Card className="relative overflow-hidden p-5">
      <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-accent/[0.06] blur-2xl" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-cream-faint">{label}</p>
        <span className="grid size-8 place-items-center rounded-xl border border-line bg-surface-2 text-accent">{icon}</span>
      </div>
      {loading || !metric ? (
        <>
          <Skeleton className="mt-3 h-8 w-24" />
          <Skeleton className="mt-3 h-4 w-32" />
        </>
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-cream">{formatCompact(metric.value)}</p>
          {change != null ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-cream-faint">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                  up ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                )}
              >
                {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {formatPercent(change, true)}
              </span>
              {comparison}
            </p>
          ) : (
            <p className="mt-2 text-xs text-cream-faint">{comparison}</p>
          )}
        </>
      )}
    </Card>
  );
}
