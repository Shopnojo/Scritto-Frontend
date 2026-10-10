"use client";

import { useState } from "react";
import { BellOff, ChevronDown } from "lucide-react";
import type { AdminNotification } from "@/types/notification";
import type { Paginated } from "@/types/api";
import type { ApiQueryState } from "@/lib/hooks/useApiQuery";
import { getNotification } from "@/lib/api/notifications";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/utils/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Spinner";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { NotificationStatusBadge } from "./NotificationStatusBadge";

function NotificationDetail({ id }: { id: string }) {
  // Fetch the single record so delivery stats are current, not the list snapshot.
  const detail = useApiQuery((signal) => getNotification(id, signal), [id]);

  if (detail.error) return <ErrorState error={detail.error} onRetry={detail.refetch} className="py-4" />;
  if (!detail.data) return <Skeleton className="h-20 w-full" />;

  const n = detail.data;
  const stats: [string, string][] = [
    ["Audience", n.audience === "all" ? "All installations" : "Specific installations"],
    ["Recipients", formatNumber(n.recipient_count)],
    ["Delivered", formatNumber(n.success_count)],
    ["Failed", formatNumber(n.failure_count)],
    ["Created", formatDateTime(n.created_at)],
    ["Sent", formatDateTime(n.sent_at)],
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm whitespace-pre-line text-cream-muted">{n.body}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-cream-faint">{label}</dt>
            <dd className="text-cream tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function NotificationHistory({
  query,
  onPageChange,
}: {
  query: ApiQueryState<Paginated<AdminNotification>>;
  onPageChange: (page: number) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader title="History" description="Previously sent notifications" />
      <div className="mt-3">
        {query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : query.isLoading || !query.data ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : query.data.items.length === 0 ? (
          <EmptyState icon={<BellOff className="size-5" />} title="No notifications sent yet" description="Sent notifications will be listed here." />
        ) : (
          <>
            <ul className="divide-y divide-line/60 border-t border-line">
              {query.data.items.map((n) => {
                const open = expanded === n.id;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : n.id)}
                      aria-expanded={open}
                      className="focus-ring flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-surface-3/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-cream">{n.title}</p>
                        <p className="mt-0.5 text-xs text-cream-faint">
                          {n.audience === "all" ? "All installations" : `${formatNumber(n.recipient_count)} selected installation${n.recipient_count === 1 ? "" : "s"}`} ·{" "}
                          <time dateTime={n.created_at} title={formatDateTime(n.created_at)}>
                            {formatRelative(n.created_at)}
                          </time>
                        </p>
                      </div>
                      <NotificationStatusBadge status={n.status} />
                      <ChevronDown className={cn("size-4 shrink-0 text-cream-faint transition-transform", open && "rotate-180")} />
                    </button>
                    {open && (
                      <div className="bg-surface-2/50 px-5 pt-1 pb-4">
                        <NotificationDetail id={n.id} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pagination page={query.data.page} pageSize={query.data.page_size} total={query.data.total} onPageChange={onPageChange} />
          </>
        )}
      </div>
    </Card>
  );
}
