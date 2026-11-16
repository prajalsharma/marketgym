"use client";

import { useEffect, useRef } from "react";
import type { OrderBookSnapshot } from "@/lib/types/market";
import { DataSourceTag } from "@/components/ui";
import { Term } from "@/components/shared/term";
import { formatPercent, formatPrice, formatQuantity, formatTime } from "@/lib/client/format";
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
  const spreadRef = useRef<HTMLDivElement | null>(null);

  // Keep the spread in the middle of the viewport whenever the book changes.
  useEffect(() => {
    const box = scrollRef.current;
    const mid = spreadRef.current;
    if (!box || !mid) return;
    if (box.scrollHeight <= box.clientHeight) return;
    box.scrollTop = mid.offsetTop - box.clientHeight / 2 + mid.offsetHeight / 2;
  }, [book.timestamp, book.market]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pb-2 text-xs text-muted">
        <span className="font-medium text-fg">{book.displayName}</span>
        <span>
          <Term explain={BOOK_TERMS.tick}>Tick</Term> {book.tickSize} · <Term explain={BOOK_TERMS.lot}>Lot</Term>{" "}
          {book.lotSize}
        </span>
        <span>Snapshot {formatTime(book.timestamp)}</span>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr] px-2 pb-1 text-[11px] text-muted">
        <span>Price ({book.quoteAsset})</span>
        <span className="text-right">Size ({book.baseAsset})</span>
        <span className="text-right">
          <Term explain={BOOK_TERMS.depth}>Total</Term>
        </span>
      </div>

      <div ref={scrollRef} className="relative min-h-0 overflow-y-auto rounded-md border border-line">
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
            />
          ))}
        </ol>

        <div ref={spreadRef} className="flex items-center justify-between gap-3 border-y border-line bg-surface-raised px-2 py-1.5 text-xs">
          <span className="text-muted">
            <Term explain={BOOK_TERMS.spread}>Spread</Term>
          </span>
          <span className="font-mono tabular-nums">
            {formatPrice(book.spread, book.tickSize)}{" "}
            <span className="text-muted">
              ({formatPercent(book.spreadPercentage, { signed: false, digits: 3 })})
            </span>
          </span>
          <span className="font-mono tabular-nums text-muted">mid {formatPrice(book.midPrice, book.tickSize)}</span>
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
            />
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-2 text-xs text-muted">
        <span>
          <Term explain={BOOK_TERMS.bestBid}>Best bid</Term>{" "}
          <span className="font-mono tabular-nums text-bid">{formatPrice(book.bestBid, book.tickSize)}</span>
          {" · "}
          <Term explain={BOOK_TERMS.bestAsk}>Best ask</Term>{" "}
          <span className="font-mono tabular-nums text-ask">{formatPrice(book.bestAsk, book.tickSize)}</span>
        </span>
        <span>
          <Term explain={BOOK_TERMS.imbalance}>Bid share of depth</Term>{" "}
          <span className="font-mono tabular-nums text-fg">
            {book.bidShareOfDepth === null ? "—" : book.bidShareOfDepth.toFixed(2)}
          </span>
        </span>
      </div>
      <div className="pt-2">
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
}: {
  price: string;
  qty: string;
  cum: string;
  share: number;
  side: "ask" | "bid";
  best: boolean;
  rowH: string;
}) {
  return (
    <li
      className={cn(
        "relative grid grid-cols-[1fr_1fr_1fr] items-center px-2 font-mono text-xs tabular-nums",
        rowH,
        best && "bg-surface-raised font-semibold",
      )}
      aria-label={`${side === "ask" ? "Ask" : "Bid"} ${price}, size ${qty}, total ${cum}${best ? ", best" : ""}`}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 right-0 opacity-15", side === "ask" ? "bg-ask" : "bg-bid")}
        style={{ width: `${Math.round(Math.min(1, share) * 100)}%` }}
      />
      <span className={cn("relative", side === "ask" ? "text-ask" : "text-bid")}>{price}</span>
      <span className="relative text-right">{qty}</span>
      <span className="relative text-right text-muted">{cum}</span>
    </li>
  );
}
