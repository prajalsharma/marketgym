import type { OrderBookSnapshot } from "@/lib/types/market";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { OrderBookLadder } from "@/components/orderbook/ladder";
import { formatPercent } from "@/lib/client/format";
import { EVIDENCE_CARD } from "./snapshot-card";

export function OrderBookCard({ book }: { book: OrderBookSnapshot }) {
  const bidShare = book.bidShareOfDepth;
  return (
    <Card tone="evidence" className={EVIDENCE_CARD}>
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Order book · {book.displayName}</CardTitle>
        <span className="text-xs text-muted">top 6 levels</span>
      </CardHeader>
      <CardContent>
        {bidShare !== null ? (
          <div className="mb-4">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted">
                Bids <span className="font-mono tabular-nums text-bid">{formatPercent(bidShare * 100, { signed: false, digits: 0 })}</span>
              </span>
              <span className="text-muted">Resting depth</span>
              <span className="text-muted">
                <span className="font-mono tabular-nums text-ask">{formatPercent((1 - bidShare) * 100, { signed: false, digits: 0 })}</span> Asks
              </span>
            </div>
            <div className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-sm" aria-hidden="true">
              <div className="h-full rounded-l-sm bg-bid" style={{ width: `${bidShare * 100}%` }} />
              <div className="h-full flex-1 rounded-r-sm bg-ask" />
            </div>
          </div>
        ) : null}
        <OrderBookLadder book={book} levels={6} compact />
      </CardContent>
    </Card>
  );
}
