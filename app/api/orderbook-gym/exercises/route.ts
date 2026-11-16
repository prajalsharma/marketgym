import { requireUser } from "@/lib/auth/session";
import { listOrderBookExercises } from "@/lib/learning/orderbook-exercises";
import { handle, ok } from "@/lib/server/api";
import type { OrderBookExercise } from "@/lib/types";

export const GET = handle(async () => {
  await requireUser();
  return ok<OrderBookExercise[]>(listOrderBookExercises());
});
