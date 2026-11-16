"use client";

import * as React from "react";
import type { DataProvenance, DataSourceKind } from "@/lib/types/market";
import { cn } from "@/lib/utils";
import { dotVariants } from "./status-dot";

const PROVIDER_LABEL: Record<DataProvenance["provider"], string> = {
  sosovalue: "SoSoValue",
  sodex: "SoDEX",
  fixture: "Demo fixture",
};

const KIND_LABEL: Record<DataSourceKind, string> = {
  live: "Live",
  cached: "Cached",
  demo: "Demo data",
};

/** "3 min ago" from an ISO string. Exported so other surfaces match. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "unknown time";
  const diff = Math.max(0, now - t);
  const s = Math.round(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} mo ago`;
  return `${Math.round(mo / 12)} y ago`;
}

export interface DataSourceTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  provenance: DataProvenance;
  /** Dot + kind + time only; provider and note move to the title. */
  compact?: boolean;
}

/**
 * Every evidence card shows one of these. Live is green, cached is amber,
 * demo is violet with a dashed border and the words "Demo data", so demo can
 * never be mistaken for live even in a screenshot.
 */
const DataSourceTag = React.forwardRef<HTMLSpanElement, DataSourceTagProps>(
  ({ provenance, compact = false, className, ...props }, ref) => {
    const { kind, provider, fetchedAt, asOf, note } = provenance;
    const timeIso = asOf ?? fetchedAt;

    // Re-render each minute so "3 min ago" keeps up without a reload.
    const [now, setNow] = React.useState(() => Date.now());
    React.useEffect(() => {
      const id = window.setInterval(() => setNow(Date.now()), 60_000);
      return () => window.clearInterval(id);
    }, []);

    const relative = formatRelativeTime(timeIso, now);
    const providerLabel = PROVIDER_LABEL[provider] ?? provider;
    const kindLabel = KIND_LABEL[kind];
    const title = [
      `${providerLabel} · ${kindLabel}`,
      `${asOf ? "As of" : "Fetched"} ${timeIso}`,
      asOf && asOf !== fetchedAt ? `Fetched ${fetchedAt}` : null,
      note ?? null,
    ]
      .filter(Boolean)
      .join("\n");

    return (
      <span
        ref={ref}
        data-kind={kind}
        title={compact ? title : undefined}
        className={cn(
          "inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-sm border px-2 py-1 text-xs leading-4",
          kind === "demo"
            ? "border-dashed border-fresh-demo/60 bg-fresh-demo-soft text-fg"
            : "border-line bg-surface-raised text-muted",
          className,
        )}
        {...props}
      >
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className={dotVariants({ tone: kind })} />
          <span className={cn("font-medium", kind === "demo" ? "text-fresh-demo" : "text-fg")}>
            {kindLabel}
          </span>
        </span>
        {!compact ? (
          <>
            <span aria-hidden className="text-subtle">
              ·
            </span>
            <span>{providerLabel}</span>
          </>
        ) : null}
        <span aria-hidden className="text-subtle">
          ·
        </span>
        <time dateTime={timeIso} title={timeIso} suppressHydrationWarning>
          {relative}
        </time>
        {!compact && note ? (
          <span className="basis-full text-subtle" title={note}>
            {note}
          </span>
        ) : null}
      </span>
    );
  },
);
DataSourceTag.displayName = "DataSourceTag";

export { DataSourceTag, PROVIDER_LABEL, KIND_LABEL };
