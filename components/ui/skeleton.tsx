import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CSS-only skeleton with a shimmer sweep (the animate-skeleton class stays as a test hook). Reserve the final size of the content so nothing shifts.
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
            className="skeleton-shimmer animate-skeleton h-3.5 rounded-sm"
            style={{ width: i === lines - 1 ? "62%" : "100%" }}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={cn("skeleton-shimmer animate-skeleton rounded-sm", className)}
      {...props}
    />
  );
}

export { Skeleton };
