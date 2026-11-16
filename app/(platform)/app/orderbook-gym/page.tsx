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
        description="A live SoDEX book, read-only. Work out spread, depth and imbalance by hand, then check."
      />
      {res.ok ? (
        <OrderBookGym exercises={res.data} initialExerciseId={exercise} />
      ) : (
        <RetryError title="Could not load the exercises" description={describeError(res.error)} />
      )}
    </div>
  );
}
