"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Send } from "lucide-react";
import type { AdminNotification, NotificationAudience } from "@/types/notification";
import { sendNotification } from "@/lib/api/notifications";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { InlineError } from "@/components/ui/States";
import { Logo } from "@/components/layout/Logo";

const TITLE_MAX = 65;
const BODY_MAX = 240;
const MAX_RECIPIENT_IDS = 500;

/** Splits pasted IDs on commas/whitespace. The backend still validates every ID. */
function parseIds(raw: string): string[] {
  return [...new Set(raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))];
}

export function NotificationForm({ onSent }: { onSent: (notification: AdminNotification) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<NotificationAudience>("all");
  const [rawIds, setRawIds] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const [sent, setSent] = useState<AdminNotification | null>(null);

  const ids = parseIds(rawIds);
  const idsError =
    audience === "devices" && ids.length > MAX_RECIPIENT_IDS ? `Up to ${MAX_RECIPIENT_IDS} installation IDs per send.` : null;
  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (audience === "all" || (ids.length > 0 && !idsError)) &&
    !sending;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    const audienceText = audience === "all" ? "ALL installations" : `${ids.length} installation${ids.length === 1 ? "" : "s"}`;
    if (!window.confirm(`Send "${title.trim()}" to ${audienceText}? This can't be undone.`)) return;

    setSending(true);
    setError(undefined);
    setSent(null);
    try {
      const result = await sendNotification({
        title: title.trim(),
        body: body.trim(),
        audience,
        device_ids: audience === "devices" ? ids : undefined,
      });
      setSent(result);
      setTitle("");
      setBody("");
      setRawIds("");
      onSent(result);
    } catch (err) {
      setError(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Compose push notification"
        description="Sent by the backend through Firebase Cloud Messaging. Requires FCM in the Android app."
      />
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-cream-muted">Audience</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["all", "All installations", "Every install with push enabled"],
                  ["devices", "Specific installations", "Paste installation IDs"],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={cn(
                    "cursor-pointer rounded-xl border px-3 py-2.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60",
                    audience === value ? "border-accent/50 bg-accent-soft/60" : "border-line-strong bg-surface-2 hover:border-cream-faint/40",
                  )}
                >
                  <input
                    type="radio"
                    name="audience"
                    value={value}
                    checked={audience === value}
                    onChange={() => setAudience(value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-medium text-cream">{label}</span>
                  <span className="block text-xs text-cream-faint">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {audience === "devices" && (
            <Field
              label="Installation IDs"
              htmlFor="device-ids"
              hint={`${ids.length} unique ID${ids.length === 1 ? "" : "s"}. Separate with commas or new lines.`}
              error={idsError}
            >
              <Textarea
                id="device-ids"
                value={rawIds}
                onChange={(e) => setRawIds(e.target.value)}
                placeholder="e.g. 3f2c…, 9a1b…"
                className="min-h-20 font-mono text-xs"
                aria-invalid={Boolean(idsError)}
              />
            </Field>
          )}

          <Field label="Title" htmlFor="title" hint={`${title.length}/${TITLE_MAX}`}>
            <Input id="title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="What's new in Scritto" />
          </Field>

          <Field label="Message" htmlFor="body" hint={`${body.length}/${BODY_MAX}`}>
            <Textarea id="body" value={body} maxLength={BODY_MAX} onChange={(e) => setBody(e.target.value)} placeholder="Keep it short and useful." />
          </Field>

          {/* Preview */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-cream-muted">Preview</p>
            <div className="rounded-2xl border border-line bg-surface-3/60 p-3">
              <div className="flex items-start gap-3">
                <Logo showLabel={false} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between text-[11px] text-cream-faint">
                    Scritto <span>now</span>
                  </p>
                  <p className="truncate text-sm font-medium text-cream">{title.trim() || "Notification title"}</p>
                  <p className="line-clamp-2 text-xs text-cream-muted">{body.trim() || "Your message will appear here."}</p>
                </div>
              </div>
            </div>
          </div>

          <InlineError error={error} />

          {sent && (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-success/25 bg-success-soft px-3 py-2 text-xs text-success">
              <CheckCircle2 className="size-3.5 shrink-0" />
              Notification &ldquo;{sent.title}&rdquo; was submitted.
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full" loading={sending} disabled={!canSend}>
            {!sending && <Send className="size-4" />}
            Send notification
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
