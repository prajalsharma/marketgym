import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** One short line under the value: a unit, a comparison, or a time. */
  hint?: React.ReactNode;
  /** Colour the value by meaning. Default is plain ink. */
  tone?: "default" | "success" | "danger" | "muted";
  size?: "sm" | "md";
}

/**
 * Label, value, hint. Values are tabular so rows of stats align. No giant
 * number, no gradient, no icon tile: a stat is a labelled figure.
 */
const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  ({ className, label, value, hint, tone = "default", size = "md", ...props }, ref) => (
    <div ref={ref} className={cn("flex min-w-0 flex-col gap-0.5", className)} {...props}>
      <span className="truncate text-xs text-muted">{label}</span>
      <span
        className={cn(
          "tabular truncate font-semibold leading-tight",
          size === "sm" ? "text-base" : "text-lg",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "muted" && "text-muted",
          tone === "default" && "text-fg",
        )}
      >
        {value}
      </span>
      {hint ? <span className="truncate text-xs text-subtle">{hint}</span> : null}
    </div>
  ),
);
Stat.displayName = "Stat";

export { Stat };
