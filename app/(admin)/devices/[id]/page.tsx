import type { Metadata } from "next";
import { DeviceDetails } from "@/components/devices/DeviceDetails";

export const metadata: Metadata = { title: "Installation" };

export default async function DeviceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeviceDetails deviceId={id} />;
}
