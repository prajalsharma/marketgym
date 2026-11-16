import type { OrderBookSnapshot } from "@/lib/types/market";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { OrderBookLadder } from "@/components/orderbook/ladder";

export function OrderBookCard({ book }: { book: OrderBookSnapshot }) {
  return (
    <Card tone="evidence">
      <CardHeader>
        <CardTitle className="text-base">Order book · {book.displayName}</CardTitle>
      </CardHeader>
      <CardContent>
        <OrderBookLadder book={book} levels={6} compact />
      </CardContent>
    </Card>
  );
}
