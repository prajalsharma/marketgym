import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CSS-only skeleton. Reserve the final size of the content so nothing shifts.
 * Pass `lines` for a text block.
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

function Skeleton({ className, lines, ...props }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={cn("flex flex-col gap-2", className)} aria-hidden {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 animate-skeleton rounded-sm bg-surface-raised"
            style={{ width: i === lines - 1 ? "62%" : "100%" }}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={cn("animate-skeleton rounded-sm bg-surface-raised", className)}
      {...props}
    />
  );
}

export { Skeleton };
