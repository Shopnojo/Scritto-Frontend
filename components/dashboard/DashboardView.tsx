"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Download, Smartphone, Zap } from "lucide-react";
import type { AnalyticsPeriod } from "@/types/api";
import { getEventAnalytics, getInstallAnalytics, getOverview, getVersionAnalytics } from "@/lib/api/analytics";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { BreakdownBars } from "@/components/analytics/BreakdownBars";
import { PeriodSelect } from "@/components/analytics/PeriodSelect";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/States";
import { RecentActivity } from "./RecentActivity";
import { StatCard } from "./StatCard";
import { UsageChart } from "./UsageChart";

export function DashboardView() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);

  const overview = useApiQuery((signal) => getOverview(period, signal), [period]);
  const usage = useApiQuery((signal) => getInstallAnalytics(period, signal), [period]);
  const events = useApiQuery((signal) => getEventAnalytics(7, signal), []);
  const versions = useApiQuery((signal) => getVersionAnalytics(signal), []);

  const comparison = `vs previous ${period} days`;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Anonymous usage across all Scritto installations."
        actions={<PeriodSelect value={period} onChange={setPeriod} />}
      />

      {overview.error ? (
        <Card className="mb-6">
          <ErrorState error={overview.error} onRetry={overview.refetch} />
        </Card>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total installs" icon={<Smartphone className="size-4" />} metric={overview.data?.total_installs} comparison={comparison} loading={overview.isLoading} />
          <StatCard label={`Active installs (${period}d)`} icon={<Zap className="size-4" />} metric={overview.data?.active_installs} comparison={comparison} loading={overview.isLoading} />
          <StatCard label={`New installs (${period}d)`} icon={<Download className="size-4" />} metric={overview.data?.new_installs} comparison={comparison} loading={overview.isLoading} />
          <StatCard label={`Events (${period}d)`} icon={<Activity className="size-4" />} metric={overview.data?.events} comparison={comparison} loading={overview.isLoading} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Daily active installs" description={`Installations that sent at least one event · last ${period} days`} />
          <CardBody>
            {usage.error ? (
              <ErrorState error={usage.error} onRetry={usage.refetch} />
            ) : usage.isLoading || !usage.data ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <UsageChart data={usage.data.daily_active} seriesLabel="Active installs" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="App versions"
            description="Share of installations"
            action={
              <Link href="/analytics" className="focus-ring inline-flex items-center gap-1 rounded-md text-xs text-cream-faint hover:text-accent">
                Details <ArrowRight className="size-3" />
              </Link>
            }
          />
          <CardBody>
            {versions.error ? (
              <ErrorState error={versions.error} onRetry={versions.refetch} />
            ) : versions.isLoading || !versions.data ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            ) : (
              <BreakdownBars
                items={versions.data.versions}
                limit={5}
                tagFor={(item) => (item.label === versions.data?.latest_version ? "Latest" : null)}
              />
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title="Recent activity" description="Latest events reported by the app" />
          <div className="mt-3">
            {events.error ? (
              <ErrorState error={events.error} onRetry={events.refetch} />
            ) : events.isLoading || !events.data ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : (
              <RecentActivity events={events.data.recent.slice(0, 8)} />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
