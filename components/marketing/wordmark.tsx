import { cn } from "@/lib/utils";

/** Text wordmark with a small bar-pair mark. Inherits colour; no gradients. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="text-accent">
        <rect x="2" y="7" width="4" height="9" rx="1" fill="currentColor" />
        <rect x="7" y="2" width="4" height="14" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="12" y="10" width="4" height="6" rx="1" fill="currentColor" opacity="0.45" />
      </svg>
      MarketGym
    </span>
  );
}
