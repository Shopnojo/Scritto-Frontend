const compactFormatter = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const numberFormatter = new Intl.NumberFormat("en");
const dateFormatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const shortDayFormatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });
const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatNumber(value: number | null | undefined): string {
  return value == null ? "—" : numberFormatter.format(value);
}

/** 1,284 → "1,284"; 12,900 → "12.9K". Full numbers below 10K stay readable. */
export function formatCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  return Math.abs(value) < 10_000 ? numberFormatter.format(value) : compactFormatter.format(value);
}

export function formatPercent(value: number | null | undefined, signed = false): string {
  if (value == null) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}

/** For YYYY-MM-DD calendar days from analytics series. */
export function formatDay(day: string): string {
  const date = toDate(`${day}T00:00:00Z`);
  return date ? shortDayFormatter.format(date) : day;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

export function formatRelative(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "Never";
  const seconds = (date.getTime() - Date.now()) / 1000;
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/** "note_created" → "Note created" */
export function humaniseEvent(eventName: string): string {
  const text = eventName.replace(/[_.-]+/g, " ").trim().replace(/\b(ai|pdf|ui)\b/gi, (m) => m.toUpperCase());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Samsung" + "Galaxy S24" → "Samsung Galaxy S24", but "OnePlus" + "OnePlus 12" → "OnePlus 12". */
export function deviceName(manufacturer?: string | null, model?: string | null): string {
  if (!model) return manufacturer || "Unknown device";
  if (!manufacturer || model.toLowerCase().startsWith(manufacturer.toLowerCase())) return model;
  return `${manufacturer} ${model}`;
}

/** First block of a UUID-like ID, for compact display ("3f2c9a1b"). */
export function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.split("-")[0].slice(0, 8);
}

export function initials(name: string | null | undefined, fallback = "?"): string {
  const parts = (name ?? "").trim().split(/[\s._@-]+/).filter(Boolean);
  if (!parts.length) return fallback;
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
