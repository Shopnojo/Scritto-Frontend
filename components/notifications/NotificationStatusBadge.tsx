import type { NotificationStatus } from "@/types/notification";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

const META: Record<NotificationStatus, { label: string; tone: BadgeTone }> = {
  queued: { label: "Queued", tone: "neutral" },
  sending: { label: "Sending", tone: "info" },
  sent: { label: "Sent", tone: "success" },
  partial: { label: "Partially sent", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
};

export function NotificationStatusBadge({ status }: { status: NotificationStatus | string }) {
  const meta = META[status as NotificationStatus] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}
