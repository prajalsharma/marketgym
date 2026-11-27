import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * CSS-only progress bar. No Radix, no JS: a track and a fill whose width is
 * the value. Grows in on first paint (transform) and transitions width on
 * change; both are disabled under reduced motion by the global rule.
 */
const fillVariants = cva(
  "progress-fill h-full rounded-full transition-[width] duration-(--duration-slow) ease-(--ease-out)",
  {
    variants: {
      tone: {
        accent: "bg-accent",
        success: "bg-success",
        warning: "bg-warning",
        danger: "bg-danger",
        neutral: "bg-line-strong",
        evidence: "bg-evidence-fg",
        learner: "bg-learner-fg",
      },
    },
    defaultVariants: { tone: "accent" },
  },
);

export interface ProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof fillVariants> {
  /** 0..100 */
  value: number;
  /** Accessible name, e.g. "Factual accuracy". */
  label?: string;
  size?: "sm" | "md";
  /** Render the number next to the bar. */
  showValue?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, tone, label, size = "md", showValue = false, "aria-label": ariaLabel, ...props }, ref) => {
    const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    return (
      <div ref={ref} className={cn("flex items-center gap-3", className)} {...props}>
        <div
          role="progressbar"
          aria-label={label ?? ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped)}
          className={cn(
            "w-full overflow-hidden rounded-full bg-surface-sunken",
            size === "sm" ? "h-1.5" : "h-2",
          )}
        >
          <div className={fillVariants({ tone })} style={{ width: `${clamped}%` }} />
        </div>
        {showValue ? (
          <span className="tabular w-9 shrink-0 text-right text-xs text-muted">
            {Math.round(clamped)}
          </span>
        ) : null}
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
