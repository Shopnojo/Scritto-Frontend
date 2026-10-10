"use client";

import type { AnalyticsPeriod } from "@/types/api";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

const OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

export function PeriodSelect({ value, onChange }: { value: AnalyticsPeriod; onChange: (v: AnalyticsPeriod) => void }) {
  return <SegmentedControl label="Reporting period" options={OPTIONS} value={value} onChange={onChange} />;
}
