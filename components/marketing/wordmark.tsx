import { cn } from "@/lib/utils";

/** The MarketGym mark: the same chart line as the favicon and app icon. */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={cn("shrink-0", className)}>
      <rect width="32" height="32" rx="6.4" fill="#0b1120" />
      <path d="M4.48 24.96 L9.60 9.60 L16.00 19.20 L22.40 7.68 L27.52 14.08" fill="none" stroke="#8da2ff" strokeWidth="3.52" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="27.52" cy="14.08" r="2.4" fill="#0b1120" stroke="#8da2ff" strokeWidth="1.936" />
    </svg>
  );
}

/** Logo mark + name. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      MarketGym
    </span>
  );
}
