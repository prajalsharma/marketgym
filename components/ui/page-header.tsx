import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons, right-aligned on wide screens, below on phones. */
  actions?: React.ReactNode;
  /** Small line above the description: a DataSourceTag, a StatusDot, a breadcrumb. */
  meta?: React.ReactNode;
  /** Heading level. Pages use h1 (default); panels use h2. */
  as?: "h1" | "h2";
}

/** Page title block. No eyebrow, no divider line by default; spacing does the work. */
function PageHeader({ className, title, description, actions, meta, as = "h1", ...props }: PageHeaderProps) {
  const Heading = as;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <Heading className={cn("font-semibold text-fg", as === "h1" ? "text-xl" : "text-lg")}>
          {title}
        </Heading>
        {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
        {description ? (
          <p className="max-w-prose text-sm text-muted sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export { PageHeader };
