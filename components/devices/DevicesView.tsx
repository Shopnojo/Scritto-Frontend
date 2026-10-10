"use client";

import { Smartphone } from "lucide-react";
import { getDeviceAnalytics, getVersionAnalytics } from "@/lib/api/analytics";
import { listDevices } from "@/lib/api/devices";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { parsePage, useQueryState } from "@/lib/hooks/useQueryState";
import { formatNumber } from "@/lib/utils/format";
import { BreakdownBars } from "@/components/analytics/BreakdownBars";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/Spinner";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { DeviceTable } from "./DeviceTable";

const PAGE_SIZE = 20;

const barsSkeleton = (
  <div className="space-y-4">
    {Array.from({ length: 4 }, (_, i) => (
      <Skeleton key={i} className="h-7 w-full" />
    ))}
  </div>
);

export function DevicesView() {
  const query = useQueryState();
  const page = parsePage(query.get("page"));
  const search = query.get("search");
  const version = query.get("app_version");

  const stats = useApiQuery((signal) => getDeviceAnalytics(signal), []);
  const versions = useApiQuery((signal) => getVersionAnalytics(signal), []);
  const devices = useApiQuery(
    (signal) =>
      listDevices({ page, page_size: PAGE_SIZE, search: search || undefined, app_version: version || undefined }, signal),
    [page, search, version],
  );

  const hasFilters = Boolean(search || version);

  return (
    <>
      <PageHeader
        title="Installations"
        description={
          devices.data
            ? `${formatNumber(devices.data.total)} ${hasFilters ? "matching installations" : "installations"} · each is an anonymous app install (Scritto has no accounts)`
            : "Each row is one anonymous installation of the app."
        }
      />

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Android versions" />
          <CardBody>
            <QueryBoundary query={stats} loading={barsSkeleton}>
              {(data) => <BreakdownBars items={data.os_versions} limit={4} />}
            </QueryBoundary>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Top models" />
          <CardBody>
            <QueryBoundary query={stats} loading={barsSkeleton}>
              {(data) => <BreakdownBars items={data.models} limit={4} />}
            </QueryBoundary>
          </CardBody>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchInput
            label="Search installations"
            placeholder="Search model or ID"
            value={search}
            onChange={(value) => query.set({ search: value, page: undefined })}
          />
          <Select
            aria-label="Filter by app version"
            value={version}
            onChange={(e) => query.set({ app_version: e.target.value, page: undefined })}
            className="w-full sm:w-44"
          >
            <option value="">All app versions</option>
            {(versions.data?.versions ?? []).map((v) => (
              <option key={v.label} value={v.label}>
                v{v.label}
              </option>
            ))}
          </Select>
          {devices.isRefreshing && <span className="text-xs text-cream-faint">Updating…</span>}
        </div>

        {devices.error ? (
          <ErrorState error={devices.error} onRetry={devices.refetch} />
        ) : !devices.isLoading && devices.data?.items.length === 0 ? (
          <EmptyState
            icon={<Smartphone className="size-5" />}
            title={hasFilters ? "No installations match these filters" : "No installations yet"}
            description={hasFilters ? undefined : "Installations appear once the app registers itself with the backend."}
            action={
              hasFilters && (
                <Button size="sm" onClick={() => query.set({ search: undefined, app_version: undefined, page: undefined })}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <DeviceTable devices={devices.data?.items ?? []} loading={devices.isLoading} />
            {devices.data && (
              <Pagination
                page={devices.data.page}
                pageSize={devices.data.page_size}
                total={devices.data.total}
                onPageChange={(next) => query.set({ page: next > 1 ? next : undefined })}
              />
            )}
          </>
        )}
      </Card>
    </>
  );
}
