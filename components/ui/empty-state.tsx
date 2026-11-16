import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A Button or link. */
  action?: React.ReactNode;
  /** Optional lucide icon element, rendered small and muted. */
  icon?: React.ReactNode;
}

/**
 * Empty states teach what the region will hold. Plain text, one action,
 * dashed boundary so it reads as "not yet" rather than "broken".
 */
function EmptyState({ className, title, description, action, icon, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong bg-surface p-5 sm:p-6",
        className,
      )}
      {...props}
    >
      {icon ? <div className="text-subtle [&_svg]:size-5">{icon}</div> : null}
      <div className="flex max-w-prose flex-col gap-1">
        <p className="text-base font-semibold text-fg">{title}</p>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
