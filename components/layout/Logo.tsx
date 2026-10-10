import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import logoMark from "@/assets/scritto-logo.png";

const SIZES = { sm: 28, md: 32, lg: 44 } as const;

interface LogoProps {
  className?: string;
  showLabel?: boolean;
  size?: keyof typeof SIZES;
}

/** Scritto mark (the Android app's launcher icon) with an optional "Scritto Admin" label. */
export function Logo({ className, showLabel = true, size = "md" }: LogoProps) {
  const px = SIZES[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src={logoMark}
        alt={showLabel ? "" : "Scritto"}
        width={px}
        height={px}
        priority
        className="shrink-0 rounded-full shadow-[0_0_24px_-6px_rgb(245_158_59/0.55)]"
      />
      {showLabel && (
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-cream">Scritto</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-cream-faint">Admin</span>
        </span>
      )}
    </div>
  );
}
