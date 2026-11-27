"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { IndexSnapshot } from "@/lib/types/market";
import { Card, CardContent, CardHeader, CardTitle, DataSourceTag } from "@/components/ui";
import { formatNumber, formatPercent } from "@/lib/client/format";
import { EASE_OUT, TIMING } from "@/lib/client/motion";
import { cn } from "@/lib/utils";
import { EVIDENCE_CARD } from "./snapshot-card";

export function IndexCard({ index }: { index: IndexSnapshot }) {
  const reduce = useReducedMotion();
  const top = index.constituents.slice(0, 5);
  const topShare = top.reduce((acc, c) => acc + c.weight, 0);
  const maxWeight = Math.max(...top.map((c) => c.weight), 1e-9);
  const change = index.percentageChange24h;
  return (
    <Card tone="evidence" className={EVIDENCE_CARD}>
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{index.name}</CardTitle>
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            change === null ? "text-muted" : change < 0 ? "text-danger" : "text-success",
          )}
        >
          {formatPercent(change)} <span className="text-muted">24h</span>
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div>
            <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">{formatNumber(index.value)}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{index.description}</p>
          </div>
          {top.length > 0 ? (
            <div>
              <div className="flex items-baseline justify-between text-xs text-muted">
                <span>Top constituents</span>
                <span>
                  top {top.length} = {formatPercent(topShare * 100, { signed: false, digits: 0 })}
                </span>
              </div>
              <ul className="mt-2 space-y-2">
                {top.map((c, i) => (
                  <li key={c.symbol} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2 text-sm">
                    <span className="font-mono uppercase">{c.symbol}</span>
                    <div className="h-2 overflow-hidden rounded-sm bg-surface-sunken" aria-hidden="true">
                      <motion.div
                        className={cn("h-full origin-left rounded-sm bg-accent", i > 0 && "opacity-60")}
                        style={{ width: `${Math.round((c.weight / maxWeight) * 100)}%` }}
                        initial={reduce ? false : { scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: TIMING.barFill, ease: EASE_OUT, delay: i * TIMING.stagger }}
                      />
                    </div>
                    <span className="text-right font-mono text-xs tabular-nums text-muted">
                      {formatPercent(c.weight * 100, { signed: false, digits: 1 })}
                    </span>
                  </li>
                ))}
              </ul>
              {index.constituents.length > top.length ? (
                <p className="mt-2 text-xs text-muted">
                  + {index.constituents.length - top.length} more constituents
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-4">
          <DataSourceTag provenance={index.provenance} compact />
        </div>
      </CardContent>
    </Card>
  );
}
