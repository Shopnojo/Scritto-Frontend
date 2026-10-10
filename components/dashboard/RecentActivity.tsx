import Link from "next/link";
import { Activity } from "lucide-react";
import type { ActivityEvent } from "@/types/analytics";
import { EmptyState } from "@/components/ui/States";
import { formatDateTime, formatRelative, humaniseEvent, shortId } from "@/lib/utils/format";

function describeProperties(properties: ActivityEvent["properties"]) {
  if (!properties) return null;
  const parts = Object.entries(properties).map(([key, value]) => `${key}: ${String(value)}`);
  return parts.length ? parts.join(" · ") : null;
}

export function RecentActivity({ events, linkDevices = true }: { events: ActivityEvent[]; linkDevices?: boolean }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Events appear here once the app starts sending anonymous usage events."
        icon={<Activity className="size-5" />}
      />
    );
  }

  return (
    <ol className="divide-y divide-line/60">
      {events.map((event) => {
        const details = describeProperties(event.properties);
        const device = `${event.device_model || "Device"} · ${shortId(event.installation_id)}`;
        return (
          <li key={event.id} className="flex items-center gap-3 px-5 py-3">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent/70" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-cream">
                {humaniseEvent(event.name)}
                {details && <span className="ml-2 text-xs text-cream-faint">{details}</span>}
              </p>
              {linkDevices ? (
                <p className="truncate text-xs text-cream-faint">
                  <Link href={`/devices/${encodeURIComponent(event.installation_id)}`} className="hover:text-accent">
                    {device}
                  </Link>
                  {event.app_version && <span> · v{event.app_version}</span>}
                </p>
              ) : (
                event.app_version && <p className="text-xs text-cream-faint">v{event.app_version}</p>
              )}
            </div>
            <time dateTime={event.occurred_at} title={formatDateTime(event.occurred_at)} className="shrink-0 text-xs text-cream-faint">
              {formatRelative(event.occurred_at)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
