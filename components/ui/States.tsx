import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RotateCw } from "lucide-react";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-3 grid size-11 place-items-center rounded-2xl border border-line bg-surface-2 text-cream-faint">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <p className="text-sm font-medium text-cream">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-cream-faint">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Shows a safe message for any error (never raw backend output) with a retry. */
export function ErrorState({
  error,
  onRetry,
  title = "Couldn't load this data",
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <div className="mb-3 grid size-11 place-items-center rounded-2xl border border-danger/25 bg-danger-soft text-danger">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-sm font-medium text-cream">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-cream-faint">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw className="size-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

export function InlineError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="flex items-center gap-2 rounded-xl border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
      <AlertTriangle className="size-3.5 shrink-0" />
      {getErrorMessage(error)}
    </p>
  );
}
