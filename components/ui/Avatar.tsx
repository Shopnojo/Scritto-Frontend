import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

export function Avatar({ name, className }: { name: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full border border-accent/20 bg-gradient-to-br from-accent-soft to-surface-3 text-[11px] font-semibold text-accent",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
