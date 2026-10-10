import { Spinner } from "@/components/ui/Spinner";
import { Logo } from "./Logo";

export function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4 text-cream-faint">
        <Logo />
        <Spinner className="size-5 text-accent" />
      </div>
    </div>
  );
}
