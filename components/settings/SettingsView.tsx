"use client";

import type { ReactNode } from "react";
import { getRemoteConfig } from "@/lib/api/config";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { env } from "@/lib/env";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Skeleton } from "@/components/ui/Spinner";
import { ConfigEditor } from "./ConfigEditor";

export function SettingsView() {
  const config = useApiQuery((signal) => getRemoteConfig(signal), []);

  const environment: [string, ReactNode][] = [
    ["API base URL", <code key="api" className="font-mono text-xs break-all">{env.apiUrl}</code>],
    ["Data source", env.useMocks ? <Badge key="m" tone="warning" dot>Mock data</Badge> : <Badge key="m" tone="success" dot>Live API</Badge>],
    ["Base path", <code key="bp" className="font-mono text-xs">{env.basePath || "/"}</code>],
    ["Build", env.isProduction ? "Production" : "Development"],
  ];

  return (
    <>
      <PageHeader title="Settings" description="Remote configuration for the Scritto app." />
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <QueryBoundary
            query={config}
            loading={
              <Card className="space-y-4 p-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </Card>
            }
          >
            {(data) => <ConfigEditor config={data} onSaved={config.setData} />}
          </QueryBoundary>
        </div>

        <Card>
          <CardHeader title="Environment" description="Read-only. Set through environment variables at deploy time." />
          <dl className="space-y-3 p-5 text-sm">
            {environment.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-cream-faint">{label}</dt>
                <dd className="min-w-0 text-right text-cream-muted">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
