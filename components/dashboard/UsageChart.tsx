"use client";

import { useEffect, useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { TimeSeriesPoint } from "@/types/analytics";
import { formatCompact, formatDay, formatNumber } from "@/lib/utils/format";

interface UsageChartProps {
  data: TimeSeriesPoint[];
  /** Series name, used in the tooltip and table header (e.g. "Active installs"). */
  seriesLabel: string;
  height?: number;
}

const PAD = { top: 12, right: 12, bottom: 26, left: 44 };

function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

/**
 * Single-series line + area chart with a crosshair tooltip, keyboard
 * navigation (←/→) and a table view for accessibility.
 */
export function UsageChart({ data, seriesLabel, height = 240 }: UsageChartProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const gradientId = useId();

  // Callback-ref state so the observer re-attaches when switching back from the table view.
  useEffect(() => {
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  const geometry = useMemo(() => {
    if (!width || data.length === 0) return null;
    const innerW = Math.max(1, width - PAD.left - PAD.right);
    const innerH = height - PAD.top - PAD.bottom;
    const max = Math.max(...data.map((d) => d.value), 0);
    const step = niceStep(max / 4);
    const yMax = Math.max(step * 4, step * Math.ceil(max / step));
    const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
    const x = (i: number) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
    const points = data.map((d, i) => [x(i), y(d.value)] as const);
    const line = points.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
    const baseline = PAD.top + innerH;
    const area = `${line}L${points.at(-1)![0].toFixed(1)},${baseline}L${points[0][0].toFixed(1)},${baseline}Z`;
    const labelCount = Math.min(data.length, Math.max(2, Math.floor(innerW / 90)));
    const xLabels = Array.from({ length: labelCount }, (_, k) =>
      Math.round((k / Math.max(1, labelCount - 1)) * (data.length - 1)),
    );
    return { innerW, innerH, ticks, x, y, points, line, area, baseline, xLabels: [...new Set(xLabels)] };
  }, [data, width, height]);

  const handlePointer = (event: PointerEvent<SVGRectElement>) => {
    if (!geometry) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rel = (event.clientX - rect.left) / rect.width;
    setActive(Math.min(data.length - 1, Math.max(0, Math.round(rel * (data.length - 1)))));
  };

  const handleKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setActive((current) => {
      const start = current ?? data.length - 1;
      return Math.min(data.length - 1, Math.max(0, start + (event.key === "ArrowRight" ? 1 : -1)));
    });
  };

  const activePoint = active != null ? data[active] : null;
  const activeXY = active != null && geometry ? geometry.points[active] : null;

  return (
    <div>
      {showTable ? (
        <div className="max-h-[260px] overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-2 text-[11px] uppercase tracking-wider text-cream-faint">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">{seriesLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-line/60">
                  <td className="px-3 py-1.5 text-cream-muted">{formatDay(d.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-cream">{formatNumber(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={setContainer} className="relative w-full" style={{ height }}>
          {geometry && (
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`${seriesLabel} over ${data.length} days. Use left and right arrow keys to inspect values.`}
              tabIndex={0}
              onKeyDown={handleKey}
              onBlur={() => setActive(null)}
              className="focus-ring block rounded-lg"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {geometry.ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    x2={PAD.left + geometry.innerW}
                    y1={geometry.y(tick)}
                    y2={geometry.y(tick)}
                    stroke="var(--color-line)"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD.left - 10}
                    y={geometry.y(tick)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-cream-faint text-[11px] tabular-nums"
                  >
                    {formatCompact(tick)}
                  </text>
                </g>
              ))}

              {geometry.xLabels.map((i) => (
                <text
                  key={i}
                  x={geometry.x(i)}
                  y={height - 6}
                  textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                  className="fill-cream-faint text-[11px]"
                >
                  {formatDay(data[i].date)}
                </text>
              ))}

              <path d={geometry.area} fill={`url(#${gradientId})`} />
              <path
                d={geometry.line}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {activeXY && (
                <g pointerEvents="none">
                  <line
                    x1={activeXY[0]}
                    x2={activeXY[0]}
                    y1={PAD.top}
                    y2={geometry.baseline}
                    stroke="var(--color-cream-faint)"
                    strokeWidth={1}
                  />
                  <circle cx={activeXY[0]} cy={activeXY[1]} r={5} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} />
                </g>
              )}

              <rect
                x={PAD.left}
                y={PAD.top}
                width={geometry.innerW}
                height={geometry.innerH}
                fill="transparent"
                onPointerMove={handlePointer}
                onPointerDown={handlePointer}
                onPointerLeave={() => setActive(null)}
              />
            </svg>
          )}

          {activePoint && activeXY && (
            <div
              className="glass pointer-events-none absolute z-10 rounded-lg px-3 py-2 text-xs shadow-xl"
              style={{
                left: Math.min(Math.max(activeXY[0], 70), width - 70),
                top: Math.max(0, activeXY[1] - 64),
                transform: "translateX(-50%)",
              }}
            >
              <p className="text-cream-faint">{formatDay(activePoint.date)}</p>
              <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-cream">
                <span aria-hidden className="size-2 rounded-full bg-accent" />
                {seriesLabel} <span className="font-semibold tabular-nums">{formatNumber(activePoint.value)}</span>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setShowTable((s) => !s)}
          className="focus-ring rounded-md px-1.5 py-0.5 text-[11px] font-medium text-cream-faint hover:text-cream"
        >
          {showTable ? "View as chart" : "View as table"}
        </button>
      </div>
    </div>
  );
}
