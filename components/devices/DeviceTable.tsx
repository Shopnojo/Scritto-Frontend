"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Device } from "@/types/device";
import { Skeleton } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { deviceName, formatDate, formatDateTime, formatNumber, formatRelative, shortId } from "@/lib/utils/format";

export function DeviceTable({ devices, loading }: { devices: Device[]; loading?: boolean }) {
  const router = useRouter();

  return (
    <Table>
      <thead>
        <tr>
          <Th>Installation</Th>
          <Th>Android</Th>
          <Th>App version</Th>
          <Th className="text-right">Events</Th>
          <Th>First seen</Th>
          <Th>Last seen</Th>
        </tr>
      </thead>
      <tbody>
        {loading
          ? Array.from({ length: 8 }, (_, i) => (
              <tr key={i}>
                <Td colSpan={6}>
                  <Skeleton className="h-8 w-full" />
                </Td>
              </tr>
            ))
          : devices.map((device) => {
              const href = `/devices/${encodeURIComponent(device.id)}`;
              return (
                <tr key={device.id} onClick={() => router.push(href)} className="cursor-pointer transition hover:bg-surface-3/40">
                  <Td>
                    <Link
                      href={href}
                      onClick={(e) => e.stopPropagation()}
                      className="focus-ring block rounded font-medium text-cream hover:text-accent"
                    >
                      {deviceName(device.manufacturer, device.model)}
                    </Link>
                    <p className="font-mono text-xs text-cream-faint">{shortId(device.id)}</p>
                  </Td>
                  <Td className="whitespace-nowrap">{device.os_version || "—"}</Td>
                  <Td className="font-mono text-xs">{device.app_version || "—"}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(device.event_count)}</Td>
                  <Td className="whitespace-nowrap">{formatDate(device.created_at)}</Td>
                  <Td className="whitespace-nowrap" title={formatDateTime(device.last_seen_at)}>
                    {formatRelative(device.last_seen_at)}
                  </Td>
                </tr>
              );
            })}
      </tbody>
    </Table>
  );
}
