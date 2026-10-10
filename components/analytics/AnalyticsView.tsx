"use client";

import { useState } from "react";
import type { AnalyticsPeriod } from "@/types/api";
import type { TimeSeriesPoint } from "@/types/analytics";
import { getDeviceAnalytics, getEventAnalytics, getInstallAnalytics, getVersionAnalytics } from "@/lib/api/analytics";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { formatNumber, humaniseEvent } from "@/lib/utils/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Skeleton } from "@/components/ui/Spinner";
import { UsageChart } from "@/components/dashboard/UsageChart";
import { BreakdownBars } from "./BreakdownBars";
import { PeriodSelect } from "./PeriodSelect";

const chartSkeleton = <Skeleton className="h-[240px] w-full" />;
const barsSkeleton = (
  <div className="space-y-4">
    {Array.from({ length: 5 }, (_, i) => (
      <Skeleton key={i} className="h-7 w-full" />
    ))}
  </div>
);

function sum(points: TimeSeriesPoint[]) {
  return points.reduce((total, p) => total + p.value, 0);
}

function average(points: TimeSeriesPoint[]) {
  return points.length ? Math.round(sum(points) / points.length) : 0;
}

export function AnalyticsView() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);

  const installs = useApiQuery((signal) => getInstallAnalytics(period, signal), [period]);
  const events = useApiQuery((signal) => getEventAnalytics(period, signal), [period]);
  const devices = useApiQuery((signal) => getDeviceAnalytics(signal), []);
  const versions = useApiQuery((signal) => getVersionAnalytics(signal), []);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Anonymous usage, engagement and adoption across Scritto installations."
        actions={<PeriodSelect value={period} onChange={setPeriod} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Daily active installs"
            description={installs.data ? `Average ${formatNumber(average(installs.data.daily_active))} per day` : `Last ${period} days`}
          />
          <CardBody>
            <QueryBoundary query={installs} loading={chartSkeleton}>
              {(data) => <UsageChart data={data.daily_active} seriesLabel="Active installs" />}
            </QueryBoundary>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="New installs"
            description={installs.data ? `${formatNumber(sum(installs.data.new_installs))} in the last ${period} days` : `Last ${period} days`}
          />
          <CardBody>
            <QueryBoundary query={installs} loading={chartSkeleton}>
              {(data) => <UsageChart data={data.new_installs} seriesLabel="New installs" />}
            </QueryBoundary>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Events per day"
            description={events.data ? `${formatNumber(sum(events.data.daily))} events in the last ${period} days` : `Last ${period} days`}
          />
          <CardBody>
            <QueryBoundary query={events} loading={chartSkeleton}>
              {(data) => <UsageChart data={data.daily} seriesLabel="Events" />}
            </QueryBoundary>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Feature usage" description={`Most frequent events, last ${period} days`} />
          <CardBody>
            <QueryBoundary query={events} loading={barsSkeleton}>
              {(data) => <BreakdownBars items={data.top_events} limit={8} formatLabel={humaniseEvent} />}
            </QueryBoundary>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="App versions" description="Installed version across installations" />
          <CardBody>
            <QueryBoundary query={versions} loading={barsSkeleton}>
              {(data) => (
                <BreakdownBars
                  items={data.versions}
                  tagFor={(item) => (item.label === data.latest_version ? "Latest" : null)}
                />
              )}
            </QueryBoundary>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Android versions" description="Operating system across installations" />
          <CardBody>
            <QueryBoundary query={devices} loading={barsSkeleton}>
              {(data) => <BreakdownBars items={data.os_versions} />}
            </QueryBoundary>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
