"use client";

import { useState } from "react";
import type { DataProvenance } from "@/lib/types/market";
import { DataSourceTag } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * The three freshness tags, as the product shows them. These are illustrations
 * of the tag itself (labelled as such), timed relative to the visitor's clock.
 */
export function ProvenanceLegend({ className }: { className?: string }) {
  const [now] = useState(() => Date.now());
  const at = (msAgo: number) => new Date(now - msAgo).toISOString();
  const rows: Array<{ p: DataProvenance; text: string }> = [
    {
      p: { kind: "live", provider: "sodex", sourceUrl: "https://sodex.com", fetchedAt: at(20_000) },
      text: "means fetched for the page you are on",
    },
    {
      p: { kind: "cached", provider: "sosovalue", sourceUrl: "https://sosovalue.com", fetchedAt: at(3 * 3_600_000) },
      text: "means kept from an earlier fetch",
    },
    {
      p: { kind: "demo", provider: "fixture", sourceUrl: "https://sosovalue.com", fetchedAt: "2026-11-06T05:42:24.000Z" },
      text: "means a fixed sample, never real-time",
    },
  ];
  return (
    <ul className={cn("divide-y divide-line rounded-lg border border-line bg-surface", className)} aria-label="How freshness is labelled">
      {rows.map(({ p, text }) => (
        <li key={p.kind} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm text-muted transition-colors duration-200 hover:bg-surface-raised">
          <DataSourceTag provenance={p} compact />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
