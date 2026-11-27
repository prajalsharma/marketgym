import type { Metadata } from "next";
import type { OrderBookExercise } from "@/lib/types/learning";
import { PageHeader } from "@/components/ui";
import { OrderBookGym } from "@/components/orderbook/orderbook-gym";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError } from "@/lib/client/api";

export const metadata: Metadata = { title: "Order book gym" };

export default async function OrderBookGymPage(props: PageProps<"/app/orderbook-gym">) {
  const sp = await props.searchParams;
  const exercise = typeof sp.exercise === "string" ? sp.exercise : undefined;
  const res = await load<OrderBookExercise[]>("/api/orderbook-gym/exercises");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Order book gym"
        description="Real SoDEX order books, read-only: BTC, ETH and ANT spot, plus the ANT-USD perpetual. Work out spread, depth and imbalance by hand, then check. The tag on each book shows where the data came from and when."
      />
      {res.ok ? (
        <OrderBookGym exercises={res.data} initialExerciseId={exercise} />
      ) : (
        <RetryError title="Could not load the exercises" description={describeError(res.error)} />
      )}
    </div>
  );
}
