"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { WealthBoardResponse } from "@/lib/types/api";
import type { WealthFund, WealthQuote } from "@/lib/types/wealth";
import { DataSourceTag, EmptyState, StatusDot } from "@/components/ui";
import { formatCompact, formatUsd } from "@/lib/client/format";
import {
  MARKET_STATUS_LABEL,
  distinctProvenance,
  headlineReturn,
  marketStatusTone,
  quoteFor,
  sortFunds,
  type SortDir,
  type SortKey,
} from "@/lib/client/wealth";
import { cn } from "@/lib/utils";
import { PctValue } from "./return-value";

interface Props {
  board: WealthBoardResponse;
  selectedId: string | null;
}

function fundHref(id: string): string {
  return `/app/wealth?fund=${encodeURIComponent(id)}`;
}

function StaleNote({ quote }: { quote: WealthQuote | null }) {
  if (!quote) return <span className="text-xs text-warning">No quote</span>;
  if (quote.priceStatus === "stale") return <span className="text-xs text-warning">Stale price</span>;
  if (quote.priceStatus === "unavailable") return <span className="text-xs text-warning">Price unavailable</span>;
  return null;
}

const COLUMNS: Array<{ key: SortKey | null; label: string; align: "left" | "right"; firstDir: SortDir }> = [
  { key: "name", label: "Fund", align: "left", firstDir: "asc" },
  { key: "price", label: "Price", align: "right", firstDir: "desc" },
  { key: "change", label: "Today", align: "right", firstDir: "desc" },
  { key: "return", label: "Return", align: "right", firstDir: "desc" },
  { key: null, label: "Hours", align: "left", firstDir: "asc" },
];

/**
 * All SoDEX Wealth funds as a sortable table (desktop) or a list (phone).
 * Selecting a row opens its detail panel. Sorting only reorders; values are untouched.
 */
export function FundBoard({ board, selectedId }: Props) {
  const { funds, quotes } = board;
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);

  if (funds.length === 0) {
    return (
      <EmptyState
        title="No funds listed right now"
        description="SoDEX Wealth returned an empty fund list. Funds will appear here when the board has data."
      />
    );
  }
  const tags = distinctProvenance([...funds.map((f) => f.provenance), ...quotes.map((q) => q.provenance)]);
  const rows = sort ? sortFunds(funds, quotes, sort.key, sort.dir) : funds;

  function toggleSort(key: SortKey, firstDir: SortDir) {
    setSort((cur) => {
      if (!cur || cur.key !== key) return { key, dir: firstDir };
      if (cur.dir === firstDir) return { key, dir: firstDir === "asc" ? "desc" : "asc" };
      return null; // third click returns to SoDEX's own order
    });
  }

  return (
    <section aria-labelledby="board-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id="board-heading" className="flex items-baseline gap-2.5 text-xl font-semibold tracking-tight">
          Fund board <span className="tabular text-sm font-normal text-muted">{funds.length} funds</span>
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((p) => (
            <DataSourceTag key={`${p.provider}:${p.kind}`} provenance={p} compact />
          ))}
        </div>
      </div>

      {/* Table from md up. No inner scroll box: the header sticks to the page while it scrolls. */}
      <div className="hidden overflow-x-clip rounded-lg border border-evidence-line bg-evidence shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--shadow-sm)] md:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            SoDEX Wealth funds with price, change today, headline return and market hours. Column headers sort the table.
          </caption>
          <thead>
            <tr className="text-xs text-muted">
              {COLUMNS.map((col) => {
                const active = col.key !== null && sort?.key === col.key;
                const ariaSort = active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none";
                return (
                  <th
                    key={col.label}
                    scope="col"
                    aria-sort={col.key ? ariaSort : undefined}
                    className={cn(
                      "sticky top-14 z-10 border-b border-evidence-line bg-surface-sunken px-3 py-2.5 font-medium first:rounded-tl-lg first:pl-4 last:rounded-tr-lg last:pr-4 lg:top-0",
                      col.align === "right" ? "text-right" : "text-left",
                      col.key === null && "hidden xl:table-cell",
                    )}
                  >
                    {col.key ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key!, col.firstDir)}
                        className={cn(
                          "group inline-flex items-center gap-1 rounded-sm transition-[color,transform] duration-150 hover:text-fg active:scale-[0.98]",
                          col.align === "right" && "flex-row-reverse",
                          active && "text-accent",
                        )}
                      >
                        {col.label}
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp className="size-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="size-3" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="stagger-in">
            {rows.map((f, i) => (
              <BoardRow key={f.fundId} index={i} fund={f} quote={quoteFor(quotes, f.fundId)} selected={f.fundId === selectedId} />
            ))}
          </tbody>
        </table>
      </div>

      {/* List on phones */}
      <ul className="stagger-in divide-y divide-evidence-line overflow-hidden rounded-lg border border-evidence-line bg-evidence shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--shadow-sm)] md:hidden">
        {funds.map((f, i) => {
          const q = quoteFor(quotes, f.fundId);
          const ret = headlineReturn(q);
          const selected = f.fundId === selectedId;
          return (
            <li key={f.fundId} style={{ "--i": i } as CSSProperties}>
              <Link
                href={fundHref(f.fundId)}
                scroll={false}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "block px-4 py-3.5 transition-colors duration-150 hover:bg-surface-raised active:bg-surface-raised",
                  selected && "bg-accent-soft shadow-[inset_3px_0_0_var(--accent)]",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold">{f.name}</span>
                  <span className="tabular shrink-0 font-mono font-medium">{formatUsd(q?.price)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{f.kindLabel}</span>
                  <span>
                    <PctValue value={q?.changePct} /> today
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-start gap-1">
                    {ret.label} <PctValue value={ret.value} />
                  </span>
                  {q ? <StatusDot tone={marketStatusTone(q.marketStatus)} label={MARKET_STATUS_LABEL[q.marketStatus]} /> : null}
                  <StaleNote quote={q} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">
        Prices and returns come straight from SoDEX Wealth. Past returns do not tell you what happens next.
      </p>
    </section>
  );
}

function BoardRow({
  fund,
  quote,
  selected,
  index,
}: {
  fund: WealthFund;
  quote: WealthQuote | null;
  selected: boolean;
  index: number;
}) {
  const ret = headlineReturn(quote);
  const cell =
    "border-b border-evidence-line px-3 py-3 align-top transition-colors duration-150 first:pl-4 last:pr-4";
  return (
    <tr
      style={{ "--i": index } as CSSProperties}
      className={cn(
        "group relative [&:last-child>*]:border-b-0",
        selected ? "bg-accent-soft" : "hover:bg-surface-raised",
      )}
    >
      <th
        scope="row"
        className={cn(
          cell,
          "min-w-[9rem] text-left font-normal transition-shadow",
          selected ? "shadow-[inset_3px_0_0_var(--accent)]" : "group-hover:shadow-[inset_3px_0_0_var(--line-strong)]",
        )}
      >
        <Link
          href={fundHref(fund.fundId)}
          scroll={false}
          aria-current={selected ? "true" : undefined}
          className={cn(
            "font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline",
            selected ? "text-accent" : "text-fg",
          )}
        >
          {fund.name}
        </Link>
        <span className="mt-0.5 block text-xs text-muted">
          {fund.kindLabel} · <span className="font-mono">{fund.shareSymbol}</span>
        </span>
        {/* Below xl the Hours column is folded in here so no column ever clips. */}
        {quote ? (
          <StatusDot
            className="mt-1 xl:hidden"
            tone={marketStatusTone(quote.marketStatus)}
            label={MARKET_STATUS_LABEL[quote.marketStatus]}
          />
        ) : null}
      </th>
      <td className={cn(cell, "tabular whitespace-nowrap text-right font-mono font-medium")}>
        {formatUsd(quote?.price)}
        {fund.nav !== null ? (
          <span className="block text-xs font-normal text-muted">NAV {formatUsd(fund.nav)}</span>
        ) : null}
        {fund.aum !== null ? (
          <span className="block text-xs font-normal text-muted">AUM {formatCompact(fund.aum, { currency: true })}</span>
        ) : null}
        <span className="block font-sans font-normal">
          <StaleNote quote={quote} />
        </span>
      </td>
      <td className={cn(cell, "whitespace-nowrap text-right")}>
        <PctValue value={quote?.changePct} />
      </td>
      <td className={cn(cell, "text-right")}>
        <PctValue value={ret.value} noteClassName="text-right" />
        <span className="block text-xs text-muted">{ret.label}</span>
      </td>
      <td className={cn(cell, "hidden whitespace-nowrap xl:table-cell")}>
        {quote ? <StatusDot tone={marketStatusTone(quote.marketStatus)} label={MARKET_STATUS_LABEL[quote.marketStatus]} /> : "—"}
      </td>
    </tr>
  );
}
