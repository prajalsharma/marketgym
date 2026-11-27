"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { NewsEvidence } from "@/lib/types/market";
import { Badge, Card, CardContent, CardHeader, CardTitle, DataSourceTag } from "@/components/ui";
import { formatDateTime } from "@/lib/client/format";
import { EASE_OUT } from "@/lib/client/motion";
import { cn } from "@/lib/utils";
import { EVIDENCE_CARD } from "./snapshot-card";

const CATEGORY_LABEL: Record<NewsEvidence["category"], string> = {
  market: "Market",
  etf: "ETF",
  macro: "Macro",
  regulation: "Regulation",
  research: "Research",
  protocol: "Protocol",
  other: "Other",
};

function NewsItem({ item }: { item: NewsEvidence }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelId = useId();
  return (
    <li className="py-1 first:pt-0 last:pb-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group -mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-md px-2 py-2 text-left outline-none transition-colors duration-150",
          "hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring",
          open && "bg-surface-raised",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium leading-snug">{item.title}</span>
            <Badge tone="neutral">{CATEGORY_LABEL[item.category]}</Badge>
          </span>
          <span className="mt-1 block text-xs text-muted">
            <span className="font-medium text-fg">{item.source}</span> · {formatDateTime(item.publishedAt)}
            <span className="ml-2 text-subtle">{open ? "Hide summary" : "Show summary"}</span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-subtle transition-transform duration-200 group-hover:text-fg",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            key="summary"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.28, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-l-2 border-evidence-line py-1 pl-3 text-sm leading-relaxed mt-2 mb-2">
              <p>{item.summary}</p>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent underline-offset-4 hover:underline"
              >
                Read at {item.source}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
              <div>
                <DataSourceTag provenance={item.provenance} compact />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export function NewsCard({ items }: { items: NewsEvidence[] }) {
  if (items.length === 0) return null;
  return (
    <Card tone="evidence" className={EVIDENCE_CARD}>
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">News</CardTitle>
        <span className="text-xs text-muted">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-evidence-line">
          {items.map((item) => (
            <NewsItem key={item.id} item={item} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
