import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Dot-and-word status. The word always accompanies the dot, so colour is never
 * the only signal. Static: it does not pulse.
 */
const dotVariants = cva("inline-block size-2 shrink-0 rounded-full", {
  variants: {
    tone: {
      neutral: "bg-subtle",
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-accent",
      live: "bg-fresh-live",
      cached: "bg-fresh-cached",
      demo: "bg-fresh-demo",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof dotVariants> {
  /** The word. Required: a dot without a word is colour-only. */
  label: React.ReactNode;
}

const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ className, tone, label, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}
      {...props}
    >
      <span aria-hidden className={dotVariants({ tone })} />
      <span>{label}</span>
    </span>
  ),
);
StatusDot.displayName = "StatusDot";

export { StatusDot, dotVariants };
