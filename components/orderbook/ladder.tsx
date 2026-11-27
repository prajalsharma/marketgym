"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { OrderBookSnapshot } from "@/lib/types/market";
import { DataSourceTag } from "@/components/ui";
import { Term } from "@/components/shared/term";
import { formatPercent, formatPrice, formatQuantity, formatTime } from "@/lib/client/format";
import { EASE_OUT, TIMING } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

export const BOOK_TERMS = {
  bestBid: "The highest price someone is willing to pay right now. A market sell fills here first.",
  bestAsk: "The lowest price someone is willing to sell at right now. A market buy fills here first.",
  spread: "Best ask minus best bid. The cost of buying and immediately selling, before fees.",
  depth: "How much quantity rests at each price. The shaded bars show the running total from the top of the book.",
  imbalance: "Share of resting quantity on the bid side. Near 0.5 is balanced; it describes resting orders, not where price will go.",
  tick: "The smallest price step an order can be placed at.",
  lot: "The smallest quantity step an order can be placed in.",
};

function sizesOf(book: OrderBookSnapshot): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const l of book.asks) sizes.set(`a${l.price}`, l.quantity);
  for (const l of book.bids) sizes.set(`b${l.price}`, l.quantity);
  return sizes;
}

interface Props {
  book: OrderBookSnapshot;
  /** rows per side; default all returned levels */
  levels?: number;
  compact?: boolean;
  className?: string;
}

/**
 * Read-only ladder: asks (ascending, best nearest the middle) above, spread callout, bids below.
 * Cumulative depth is drawn as a bar behind each row. No order entry anywhere.
 */
export function OrderBookLadder({ book, levels, compact, className }: Props) {
  const n = levels ?? Math.max(book.asks.length, book.bids.length);
  const asks = book.asks.slice(0, n);
  const bids = book.bids.slice(0, n);
  const maxCum = Math.max(
    asks[asks.length - 1]?.cumulativeQuantity ?? 0,
    bids[bids.length - 1]?.cumulativeQuantity ?? 0,
    1e-9,
  );
  const rowH = compact ? "h-7" : "h-8";
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Sizes from the previous snapshot of the same market, so changed levels can flash once.
  // Stored as derived state (updated during render when the book changes), not in a ref.
  const [tracked, setTracked] = useState<{ book: OrderBookSnapshot; prev: Map<string, number> | null }>({
    book,
    prev: null,
  });
  if (tracked.book !== book) {
    setTracked({ book, prev: tracked.book.market === book.market ? sizesOf(tracked.book) : null });
  }
  const prev = tracked.book === book ? tracked.prev : null;
  const changed = (side: "a" | "b", price: number, qty: number) => {
    if (!prev) return false;
    const before = prev.get(`${side}${price}`);
    return before === undefined || before !== qty;
  };
  const spreadRef = useRef<HTMLDivElement | null>(null);

  // Keep the spread in the middle of the viewport whenever the book changes.
  useEffect(() => {
    const box = scrollRef.current;
    const mid = spreadRef.current;
    if (!box || !mid) return;
    if (box.scrollHeight <= box.clientHeight) return;
    box.scrollTop = mid.offsetTop - box.clientHeight / 2 + mid.offsetHeight / 2;
  }, [book.timestamp, book.market]);

  const reduce = useReducedMotion() ?? false;
  const bidShare = book.bidShareOfDepth === null ? null : Math.min(1, Math.max(0, book.bidShareOfDepth));

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pb-3 text-xs text-muted">
        <span className="text-sm font-semibold text-fg">{book.displayName}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5">
            <Term explain={BOOK_TERMS.tick}>Tick</Term>{" "}
            <span className="font-mono tabular-nums text-fg">{book.tickSize}</span>
          </span>
          <span className="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5">
            <Term explain={BOOK_TERMS.lot}>Lot</Term>{" "}
            <span className="font-mono tabular-nums text-fg">{book.lotSize}</span>
          </span>
          <span className="tabular-nums">Snapshot {formatTime(book.timestamp)}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 pb-3">
        <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.04),inset_2px_0_0_var(--bid)]">
          <p className="text-xs text-muted">
            <Term explain={BOOK_TERMS.bestBid}>Best bid</Term>
          </p>
          <p className={cn("font-mono font-semibold tabular-nums text-bid", compact ? "text-base" : "text-lg sm:text-xl")}>
            {formatPrice(book.bestBid, book.tickSize)}
          </p>
        </div>
        <div className="rounded-md border border-line bg-surface px-3 py-2 text-right shadow-[inset_0_1px_0_rgb(255_255_255/0.04),inset_-2px_0_0_var(--ask)]">
          <p className="text-xs text-muted">
            <Term explain={BOOK_TERMS.bestAsk}>Best ask</Term>
          </p>
          <p className={cn("font-mono font-semibold tabular-nums text-ask", compact ? "text-base" : "text-lg sm:text-xl")}>
            {formatPrice(book.bestAsk, book.tickSize)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr] px-3 pb-1.5 text-xs text-muted">
        <span>Price ({book.quoteAsset})</span>
        <span className="text-right">Size ({book.baseAsset})</span>
        <span className="text-right">
          <Term explain={BOOK_TERMS.depth}>Total</Term>
        </span>
      </div>

      <div
        ref={scrollRef}
        className="relative min-h-0 overflow-y-auto rounded-lg border border-line bg-surface-sunken scrollbar-thin"
      >
        <ol aria-label="Asks, lowest price nearest the spread" className="flex flex-col-reverse">
          {asks.map((lvl, i) => (
            <Row
              key={`a-${lvl.price}`}
              price={formatPrice(lvl.price, book.tickSize)}
              qty={formatQuantity(lvl.quantity, book.lotSize)}
              cum={formatQuantity(lvl.cumulativeQuantity, book.lotSize)}
              share={lvl.cumulativeQuantity / maxCum}
              side="ask"
              best={i === 0}
              rowH={rowH}
              flash={changed("a", lvl.price, lvl.quantity)}
              stamp={book.timestamp}
              reduce={reduce}
            />
          ))}
        </ol>

        <div
          ref={spreadRef}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-y border-line-strong bg-surface-raised px-3 py-2.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
        >
          <span className="flex items-baseline gap-2">
            <span className="text-xs text-muted">
              <Term explain={BOOK_TERMS.spread}>Spread</Term>
            </span>
            <span className={cn("font-mono font-semibold tabular-nums text-fg", compact ? "text-sm" : "text-base")}>
              {formatPrice(book.spread, book.tickSize)}
            </span>
            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-xs tabular-nums text-accent">
              {formatPercent(book.spreadPercentage, { signed: false, digits: 3 })}
            </span>
          </span>
          <span className="font-mono text-xs tabular-nums text-muted">
            mid <span className="text-fg">{formatPrice(book.midPrice, book.tickSize)}</span>
          </span>
        </div>

        <ol aria-label="Bids, highest price nearest the spread">
          {bids.map((lvl, i) => (
            <Row
              key={`b-${lvl.price}`}
              price={formatPrice(lvl.price, book.tickSize)}
              qty={formatQuantity(lvl.quantity, book.lotSize)}
              cum={formatQuantity(lvl.cumulativeQuantity, book.lotSize)}
              share={lvl.cumulativeQuantity / maxCum}
              side="bid"
              best={i === 0}
              rowH={rowH}
              flash={changed("b", lvl.price, lvl.quantity)}
              stamp={book.timestamp}
              reduce={reduce}
            />
          ))}
        </ol>
      </div>

      <div className="space-y-1.5 pt-3 text-xs text-muted">
        <div className="flex items-center justify-between gap-3">
          <Term explain={BOOK_TERMS.imbalance}>Bid share of depth</Term>
          <span className="font-mono text-sm font-medium tabular-nums text-fg">
            {book.bidShareOfDepth === null ? "—" : book.bidShareOfDepth.toFixed(2)}
          </span>
        </div>
        {bidShare === null ? null : (
          <div aria-hidden="true" className="flex h-1.5 gap-0.5 overflow-hidden rounded-sm">
            <span
              className="rounded-sm bg-bid transition-[width] duration-500 ease-out"
              style={{ width: `${(bidShare * 100).toFixed(2)}%` }}
            />
            <span className="flex-1 rounded-sm bg-ask" />
          </div>
        )}
      </div>
      <div className="pt-3">
        <DataSourceTag provenance={book.provenance} compact />
      </div>
    </div>
  );
}

function Row({
  price,
  qty,
  cum,
  share,
  side,
  best,
  rowH,
  flash,
  stamp,
  reduce,
}: {
  flash: boolean;
  /** snapshot time; part of the key of the flash layer so a new snapshot restarts it */
  stamp: string;
  price: string;
  qty: string;
  cum: string;
  share: number;
  side: "ask" | "bid";
  best: boolean;
  rowH: string;
  reduce: boolean;
}) {
  const ask = side === "ask";
  const fill = Math.min(1, Math.max(0, share));
  return (
    <li
      className={cn(
        "group relative grid grid-cols-[1fr_1fr_1fr] items-center px-3 font-mono text-xs tabular-nums transition-colors duration-(--duration-fast) hover:bg-surface-raised",
        rowH,
        best && "font-semibold",
        best && (ask ? "shadow-[inset_2px_0_0_var(--ask)]" : "shadow-[inset_2px_0_0_var(--bid)]"),
      )}
      aria-label={`${ask ? "Ask" : "Bid"} ${price}, size ${qty}, total ${cum}${best ? ", best" : ""}`}
    >
      <motion.span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-px right-0 left-0 origin-right rounded-l-sm bg-linear-to-l group-hover:brightness-125",
          ask ? "from-ask/25 to-ask/8" : "from-bid/25 to-bid/8",
        )}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: fill }}
        transition={reduce ? { duration: 0 } : { duration: TIMING.barFill, ease: EASE_OUT }}
      />
      {flash && !reduce ? (
        <motion.span
          key={stamp}
          aria-hidden="true"
          className={cn("pointer-events-none absolute inset-0", ask ? "bg-ask" : "bg-bid")}
          initial={{ opacity: 0.38 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: EASE_OUT }}
        />
      ) : null}
      <span className={cn("relative", ask ? "text-ask" : "text-bid")}>{price}</span>
      <span className="relative text-right text-fg">{qty}</span>
      <span className="relative text-right text-fg/80">{cum}</span>
    </li>
  );
}
