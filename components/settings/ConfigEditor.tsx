"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import type { ConfigEntry, ConfigValue, RemoteConfig } from "@/types/config";
import { updateRemoteConfig } from "@/lib/api/config";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatRelative } from "@/lib/utils/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Field";
import { EmptyState, InlineError } from "@/components/ui/States";
import { Switch } from "@/components/ui/Switch";

type Kind = "boolean" | "number" | "string" | "json";

function kindOf(value: ConfigValue): Kind {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  return "json";
}

/** Drafts are kept as editor-friendly values; JSON/number fields as raw text until parsed. */
type Draft = boolean | string;

function toDraft(value: ConfigValue): Draft {
  const kind = kindOf(value);
  if (kind === "boolean") return value as boolean;
  if (kind === "json") return JSON.stringify(value, null, 2);
  return String(value);
}

function parseDraft(kind: Kind, draft: Draft): { value?: ConfigValue; error?: string } {
  if (kind === "boolean") return { value: draft as boolean };
  if (kind === "string") return { value: draft as string };
  if (kind === "number") {
    const n = Number(draft);
    return (draft as string).trim() !== "" && Number.isFinite(n) ? { value: n } : { error: "Enter a valid number." };
  }
  try {
    return { value: JSON.parse(draft as string) as ConfigValue };
  } catch {
    return { error: "Invalid JSON." };
  }
}

function sameValue(a: ConfigValue, b: ConfigValue) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function EntryControl({ entry, draft, onChange, error }: { entry: ConfigEntry; draft: Draft; onChange: (d: Draft) => void; error?: string }) {
  const kind = kindOf(entry.value);
  const id = `config-${entry.key}`;
  if (kind === "boolean") {
    return <Switch id={id} label={entry.key} checked={draft as boolean} onChange={onChange} />;
  }
  if (kind === "json") {
    return (
      <Textarea
        id={id}
        aria-label={entry.key}
        aria-invalid={Boolean(error)}
        value={draft as string}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="min-h-24 font-mono text-xs"
      />
    );
  }
  return (
    <Input
      id={id}
      aria-label={entry.key}
      aria-invalid={Boolean(error)}
      inputMode={kind === "number" ? "decimal" : undefined}
      value={draft as string}
      onChange={(e) => onChange(e.target.value)}
      className={cn("sm:w-64", kind === "number" && "tabular-nums")}
    />
  );
}

export function ConfigEditor({ config, onSaved }: { config: RemoteConfig; onSaved: (config: RemoteConfig) => void }) {
  const initial = useMemo(() => Object.fromEntries(config.entries.map((e) => [e.key, toDraft(e.value)])), [config]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Re-sync drafts when a fresh config arrives from the server.
  const [source, setSource] = useState(config);
  if (source !== config) {
    setSource(config);
    setDrafts(initial);
  }

  const parsed = config.entries.map((entry) => {
    const result = parseDraft(kindOf(entry.value), drafts[entry.key]);
    const dirty = result.error ? true : !sameValue(result.value as ConfigValue, entry.value);
    return { entry, ...result, dirty };
  });
  const changed = parsed.filter((p) => p.dirty);
  const hasErrors = parsed.some((p) => p.error);

  const handleSave = async () => {
    if (!changed.length || hasErrors) return;
    if (!window.confirm(`Publish ${changed.length} change${changed.length === 1 ? "" : "s"} to all Scritto clients?\n\n${changed.map((c) => `• ${c.entry.key}`).join("\n")}`)) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const values = Object.fromEntries(changed.map((c) => [c.entry.key, c.value as ConfigValue]));
      const updated = await updateRemoteConfig({ values });
      setSavedAt(new Date().toISOString());
      onSaved(updated);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  if (config.entries.length === 0) {
    return (
      <Card>
        <EmptyState icon={<SlidersHorizontal className="size-5" />} title="No remote config keys" description="Keys defined by the backend will appear here." />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Remote configuration"
        description={
          config.updated_at ? `Fetched by the app at launch · last changed ${formatRelative(config.updated_at)}` : "Fetched by the app at launch"
        }
        action={
          changed.length > 0 && <Badge tone="accent">{changed.length} unsaved</Badge>
        }
      />

      <ul className="mt-4 divide-y divide-line/60 border-t border-line">
        {parsed.map(({ entry, error: fieldError, dirty }) => (
          <li key={entry.key} className={cn("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between", dirty && "bg-accent-soft/20")}>
            <div className="min-w-0 sm:max-w-md">
              <label htmlFor={`config-${entry.key}`} className="flex items-center gap-2 font-mono text-sm text-cream">
                {entry.key}
                {dirty && <span aria-label="modified" className="size-1.5 rounded-full bg-accent" />}
              </label>
              {entry.description && <p className="mt-0.5 text-xs text-cream-faint">{entry.description}</p>}
              {entry.updated_at && (
                <p className="mt-1 text-[11px] text-cream-faint/80" title={formatDateTime(entry.updated_at)}>
                  Updated {formatRelative(entry.updated_at)}
                </p>
              )}
            </div>
            <div className={cn("shrink-0", kindOf(entry.value) === "json" && "sm:w-80")}>
              <EntryControl
                entry={entry}
                draft={drafts[entry.key]}
                error={fieldError}
                onChange={(d) => setDrafts((prev) => ({ ...prev, [entry.key]: d }))}
              />
              {fieldError && <p className="mt-1 text-xs text-danger">{fieldError}</p>}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4">
        <div className="mr-auto min-w-0">
          {error ? <InlineError error={error} /> : savedAt && !changed.length ? <p className="text-xs text-success">Changes published.</p> : null}
        </div>
        <Button variant="ghost" disabled={!changed.length || saving} onClick={() => setDrafts(initial)}>
          <RotateCcw className="size-4" /> Discard
        </Button>
        <Button variant="primary" loading={saving} disabled={!changed.length || hasErrors} onClick={handleSave}>
          {!saving && <Save className="size-4" />} Publish changes
        </Button>
      </div>
    </Card>
  );
}
