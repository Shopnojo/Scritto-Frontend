"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { getDevice } from "@/lib/api/devices";
import { ApiError } from "@/lib/api/errors";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { deviceName, formatDateTime, formatNumber, formatRelative, humaniseEvent } from "@/lib/utils/format";
import { BreakdownBars } from "@/components/analytics/BreakdownBars";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Spinner";
import { EmptyState, ErrorState } from "@/components/ui/States";

function BackLink() {
  return (
    <Link href="/devices" className="focus-ring inline-flex items-center gap-1.5 rounded-md text-xs text-cream-faint hover:text-cream">
      <ArrowLeft className="size-3.5" /> All installations
    </Link>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked; nothing useful to do.
        }
      }}
      className="focus-ring rounded p-1 text-cream-faint hover:text-cream"
      aria-label="Copy installation ID"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

export function DeviceDetails({ deviceId }: { deviceId: string }) {
  const device = useApiQuery((signal) => getDevice(deviceId, signal), [deviceId]);

  if (device.error) {
    const notFound = device.error instanceof ApiError && device.error.isNotFound;
    return (
      <>
        <PageHeader title="Installation" eyebrow={<BackLink />} />
        <Card>
          {notFound ? (
            <EmptyState title="Installation not found" description="The link may be wrong, or this installation was removed." />
          ) : (
            <ErrorState error={device.error} onRetry={device.refetch} />
          )}
        </Card>
      </>
    );
  }

  if (device.isLoading || !device.data) {
    return (
      <>
        <PageHeader title={<Skeleton className="h-8 w-56" />} eyebrow={<BackLink />} />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72 lg:col-span-2" />
        </div>
      </>
    );
  }

  const d = device.data;
  const name = deviceName(d.manufacturer, d.model);
  const facts: [string, ReactNode][] = [
    ["Platform", d.platform.charAt(0).toUpperCase() + d.platform.slice(1)],
    ["Android", d.os_version || "—"],
    ["App version", d.app_version ? `v${d.app_version}` : "—"],
    ["Locale", d.locale || "—"],
    ["Events", formatNumber(d.event_count)],
    ["First seen", formatDateTime(d.created_at)],
    ["Last seen", <span key="ls" title={formatDateTime(d.last_seen_at)}>{formatRelative(d.last_seen_at)}</span>],
  ];

  return (
    <>
      <PageHeader eyebrow={<BackLink />} title={name} description="Anonymous installation. No personal data is collected." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <dl className="space-y-3.5 p-5 text-sm">
              {facts.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <dt className="text-cream-faint">{label}</dt>
                  <dd className="min-w-0 truncate text-right text-cream">{value}</dd>
                </div>
              ))}
              <div className="border-t border-line pt-4">
                <dt className="text-cream-faint">Installation ID</dt>
                <dd className="mt-1 flex items-center gap-1 font-mono text-xs break-all text-cream-muted">
                  {d.id}
                  <CopyButton value={d.id} />
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Most used features" description="Recent events from this installation" />
            <CardBody>
              <BreakdownBars items={d.top_events} limit={5} formatLabel={humaniseEvent} />
            </CardBody>
          </Card>
        </div>

        <Card className="h-fit lg:col-span-2">
          <CardHeader title="Recent activity" />
          <div className="mt-3">
            <RecentActivity events={d.recent_events} linkDevices={false} />
          </div>
        </Card>
      </div>
    </>
  );
}
