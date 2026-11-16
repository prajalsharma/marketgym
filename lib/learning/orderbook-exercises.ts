/**
 * Order Book Gym: five exercises graded against the OrderBookSnapshot the
 * learner actually saw. Tolerances: 1 tick for prices, 0.5 percentage points
 * for percentages, 0.5 % relative for quantities, exact for choices. Every
 * explanation cites the book's real numbers.
 */
import type { OrderBookExerciseSubmitResponse } from "@/lib/types/api";
import type { OrderBookExercise, OrderBookExerciseQuestion } from "@/lib/types/learning";
import type { OrderBookSnapshot } from "@/lib/types/market";

export const BTC_MARKET = "vBTC_vUSDC";
export const ETH_MARKET = "vETH_vUSDC";

type Tolerance = { kind: "tick" } | { kind: "percent-points"; value: number } | { kind: "relative"; value: number } | { kind: "exact" };

interface Expected {
  /** numeric expected value or option id */
  value: number | string;
  display: string;
  tolerance: Tolerance;
  explanation: string;
}

type ExpectedFn = (books: Record<string, OrderBookSnapshot>) => Expected | null;

interface ExerciseDefinition {
  exercise: OrderBookExercise;
  expected: Record<string, ExpectedFn>;
}

function decimalsFor(tick: number): number {
  if (!Number.isFinite(tick) || tick <= 0) return 2;
  const s = tick.toString();
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  return s.includes(".") ? s.split(".")[1].length : 0;
}

export function formatPrice(book: OrderBookSnapshot, price: number): string {
  return price.toFixed(decimalsFor(book.tickSize));
}

function fmtQty(book: OrderBookSnapshot, qty: number): string {
  return qty.toFixed(Math.min(8, decimalsFor(book.lotSize)));
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function notional(levels: OrderBookSnapshot["bids"]): number {
  return levels.reduce((s, l) => s + l.price * l.quantity, 0);
}

function sumQty(levels: OrderBookSnapshot["bids"]): number {
  return levels.reduce((s, l) => s + l.quantity, 0);
}

function hasTop(book: OrderBookSnapshot | undefined): book is OrderBookSnapshot & { bestBid: number; bestAsk: number } {
  return Boolean(book && book.bestBid !== null && book.bestAsk !== null && book.bids.length > 0 && book.asks.length > 0);
}

const choice = (id: string, text: string) => ({ id, text });

const DEFINITIONS: ExerciseDefinition[] = [
  {
    exercise: {
      id: "ob-identify-spread",
      kind: "identify-spread",
      skillIds: ["orderbook.bid-ask", "orderbook.spread"],
      title: "Find the spread",
      instructions: "Read the BTC/USDC order book. Identify the best bid, the best ask and the spread between them, then say what the spread represents.",
      markets: [BTC_MARKET],
      questions: [
        { id: "best-bid", prompt: "What is the best (highest) bid price?", kind: "number", unit: "USDC" },
        { id: "best-ask", prompt: "What is the best (lowest) ask price?", kind: "number", unit: "USDC" },
        { id: "spread", prompt: "What is the spread (best ask minus best bid)?", kind: "number", unit: "USDC" },
        {
          id: "spread-meaning",
          prompt: "What does the spread represent?",
          kind: "choice",
          options: [
            choice("round-trip", "The cost of buying at the ask and immediately selling at the bid"),
            choice("fee", "A fee the exchange charges on every trade"),
            choice("min-order", "The smallest order size the market accepts"),
            choice("daily-range", "How much the price moved today"),
          ],
        },
      ],
      hints: [
        "Bids are what buyers will pay; asks are what sellers want. The best of each sits at the top of its side.",
        "The spread is a difference of two prices on the same book, so it has the same unit as the prices.",
        "Crossing the spread means paying the ask and receiving the bid: that gap is a cost to the taker, not a fee set by the venue.",
      ],
    },
    expected: {
      "best-bid": (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        return { value: b.bestBid, display: formatPrice(b, b.bestBid), tolerance: { kind: "tick" }, explanation: `The highest bid on the book is ${formatPrice(b, b.bestBid)} USDC (top of the bid side).` };
      },
      "best-ask": (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        return { value: b.bestAsk, display: formatPrice(b, b.bestAsk), tolerance: { kind: "tick" }, explanation: `The lowest ask on the book is ${formatPrice(b, b.bestAsk)} USDC (top of the ask side).` };
      },
      spread: (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        const spread = b.bestAsk - b.bestBid;
        return { value: spread, display: formatPrice(b, spread), tolerance: { kind: "tick" }, explanation: `Spread = best ask ${formatPrice(b, b.bestAsk)} − best bid ${formatPrice(b, b.bestBid)} = ${formatPrice(b, spread)} USDC, i.e. ${Math.round(spread / b.tickSize)} tick(s).` };
      },
      "spread-meaning": (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        return { value: "round-trip", display: "The cost of buying at the ask and immediately selling at the bid", tolerance: { kind: "exact" }, explanation: `Buying at ${formatPrice(b, b.bestAsk)} and selling straight away at ${formatPrice(b, b.bestBid)} loses the spread. It is a cost of immediacy, not an exchange fee and not a minimum size.` };
      },
    },
  },
  {
    exercise: {
      id: "ob-interpret-depth",
      kind: "interpret-depth",
      skillIds: ["orderbook.depth"],
      title: "Read the depth",
      instructions: "Use the cumulative quantities on the BTC/USDC book to work out how far a market order would walk through the levels.",
      markets: [BTC_MARKET],
      questions: [
        { id: "cum-bid-5", prompt: "What is the cumulative bid quantity across the top five bid levels?", kind: "number", unit: "BTC" },
        {
          id: "sell-fill-price",
          prompt: "A market sell order equal to the cumulative quantity of the top three bid levels arrives. At which price does its last fill happen?",
          kind: "choice",
          options: [
            choice("level-1", "The best bid"),
            choice("level-3", "The third bid level"),
            choice("level-5", "The fifth bid level"),
            choice("mid", "The mid price"),
          ],
        },
        {
          id: "depth-static",
          prompt: "Is the depth you see now a fixed amount that will still be there in a minute?",
          kind: "choice",
          options: [
            choice("changes", "No: resting orders can be cancelled or filled at any time, so depth is a snapshot"),
            choice("fixed", "Yes: posted liquidity stays until it trades"),
            choice("grows", "It only grows, because new orders keep arriving"),
          ],
        },
      ],
      hints: [
        "Each level's cumulative quantity is the total resting from the top of book down to that level.",
        "A market sell takes bids from the best downwards; it stops when its size is used up.",
        "The order book is a snapshot in time: anything resting can be pulled before it trades.",
      ],
    },
    expected: {
      "cum-bid-5": (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        const n = Math.min(5, b.bids.length);
        const cum = sumQty(b.bids.slice(0, n));
        return { value: cum, display: fmtQty(b, cum), tolerance: { kind: "relative", value: 0.005 }, explanation: `Adding the top ${n} bid levels (${b.bids.slice(0, n).map((l) => fmtQty(b, l.quantity)).join(" + ")}) gives ${fmtQty(b, cum)} BTC, starting from the best bid ${formatPrice(b, b.bestBid)}.` };
      },
      "sell-fill-price": (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b) || b.bids.length < 3) return null;
        const third = b.bids[2];
        return { value: "level-3", display: "The third bid level", tolerance: { kind: "exact" }, explanation: `The order consumes levels one to three; its last fill is at the third bid, ${formatPrice(b, third.price)} USDC (best bid ${formatPrice(b, b.bestBid)}).` };
      },
      "depth-static": (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        return { value: "changes", display: "No: depth is a snapshot", tolerance: { kind: "exact" }, explanation: `The book was captured at ${b.timestamp}. Resting orders around the best bid ${formatPrice(b, b.bestBid)} and best ask ${formatPrice(b, b.bestAsk)} can be cancelled or filled at any moment.` };
      },
    },
  },
  {
    exercise: {
      id: "ob-compare-liquidity",
      kind: "compare-liquidity",
      skillIds: ["orderbook.liquidity", "markets.liquidity"],
      title: "Compare two books",
      instructions: "Compare the BTC/USDC and ETH/USDC books. Decide which is cheaper to trade right now and why raw quantities can mislead.",
      markets: [BTC_MARKET, ETH_MARKET],
      questions: [
        {
          id: "tighter-spread",
          prompt: "Which market has the tighter spread relative to its price?",
          kind: "choice",
          options: [choice(BTC_MARKET, "BTC/USDC"), choice(ETH_MARKET, "ETH/USDC"), choice("same", "They are the same")],
        },
        {
          id: "more-notional",
          prompt: "Which book carries more resting value in USDC across the levels shown (both sides, price × quantity)?",
          kind: "choice",
          options: [choice(BTC_MARKET, "BTC/USDC"), choice(ETH_MARKET, "ETH/USDC")],
        },
        {
          id: "units-trap",
          prompt: "The ETH/USDC book shows far more coins resting than the BTC/USDC book. Does that alone make ETH/USDC the more liquid market?",
          kind: "choice",
          options: [
            choice("no-notional", "No: compare value in the quote currency and the spread, not raw coin counts"),
            choice("yes-coins", "Yes: more coins resting means more liquidity"),
            choice("yes-levels", "Yes: more levels always means a deeper market"),
          ],
        },
      ],
      hints: [
        "Spread as a share of price lets you compare markets with very different price levels.",
        "One BTC and one ETH are not the same amount of money; multiply quantity by price.",
        "Liquidity is the cost of trading a given value now: spread plus how far your size walks the book.",
      ],
    },
    expected: {
      "tighter-spread": (books) => {
        const btc = books[BTC_MARKET];
        const eth = books[ETH_MARKET];
        if (!hasTop(btc) || !hasTop(eth)) return null;
        const rel = (b: OrderBookSnapshot & { bestBid: number; bestAsk: number }) => ((b.bestAsk - b.bestBid) / ((b.bestAsk + b.bestBid) / 2)) * 100;
        const rb = rel(btc);
        const re = rel(eth);
        const winner = Math.abs(rb - re) < 1e-9 ? "same" : rb < re ? BTC_MARKET : ETH_MARKET;
        const label = winner === "same" ? "They are the same" : winner === BTC_MARKET ? "BTC/USDC" : "ETH/USDC";
        return { value: winner, display: label, tolerance: { kind: "exact" }, explanation: `BTC/USDC: ${formatPrice(btc, btc.bestAsk)} − ${formatPrice(btc, btc.bestBid)} = ${formatPrice(btc, btc.bestAsk - btc.bestBid)} (${rb.toFixed(4)}% of mid). ETH/USDC: ${formatPrice(eth, eth.bestAsk)} − ${formatPrice(eth, eth.bestBid)} = ${formatPrice(eth, eth.bestAsk - eth.bestBid)} (${re.toFixed(4)}% of mid).` };
      },
      "more-notional": (books) => {
        const btc = books[BTC_MARKET];
        const eth = books[ETH_MARKET];
        if (!hasTop(btc) || !hasTop(eth)) return null;
        const nb = notional(btc.bids) + notional(btc.asks);
        const ne = notional(eth.bids) + notional(eth.asks);
        const winner = nb >= ne ? BTC_MARKET : ETH_MARKET;
        return { value: winner, display: winner === BTC_MARKET ? "BTC/USDC" : "ETH/USDC", tolerance: { kind: "exact" }, explanation: `Resting value: BTC/USDC ≈ ${Math.round(nb).toLocaleString("en-US")} USDC vs ETH/USDC ≈ ${Math.round(ne).toLocaleString("en-US")} USDC over the levels shown (best bids ${formatPrice(btc, btc.bestBid)} and ${formatPrice(eth, eth.bestBid)}).` };
      },
      "units-trap": (books) => {
        const btc = books[BTC_MARKET];
        const eth = books[ETH_MARKET];
        if (!hasTop(btc) || !hasTop(eth)) return null;
        return { value: "no-notional", display: "No: compare value and spread, not coin counts", tolerance: { kind: "exact" }, explanation: `${fmtQty(eth, sumQty(eth.asks))} ETH at about ${formatPrice(eth, eth.bestAsk)} is a different amount of money from ${fmtQty(btc, sumQty(btc.asks))} BTC at about ${formatPrice(btc, btc.bestAsk)}. Compare notional value and spread.` };
      },
    },
  },
  {
    exercise: {
      id: "ob-recognise-imbalance",
      kind: "recognise-imbalance",
      skillIds: ["orderbook.imbalance"],
      title: "Spot the imbalance",
      instructions: "Work out which side of the BTC/USDC book holds more resting quantity, and what that does and does not tell you.",
      markets: [BTC_MARKET],
      questions: [
        { id: "bid-share", prompt: "What share of the displayed depth sits on the bid side, as a percentage?", kind: "number", unit: "%" },
        {
          id: "heavier-side",
          prompt: "Which side is heavier?",
          kind: "choice",
          options: [choice("bids", "Bids (buyers)"), choice("asks", "Asks (sellers)"), choice("balanced", "Roughly balanced (within 5 points of 50%)")],
        },
        {
          id: "predicts",
          prompt: "Does the heavier side guarantee where the price goes next?",
          kind: "choice",
          options: [
            choice("no", "No: resting orders can be cancelled, and the side that is heavier can still be taken out"),
            choice("yes-up", "Yes: more bids means the price must rise"),
            choice("yes-down", "Yes: more asks means the price must fall"),
          ],
        },
      ],
      hints: [
        "Bid share = total bid quantity ÷ (total bid quantity + total ask quantity) over the levels shown.",
        "Call it balanced when the share is between 45% and 55%.",
        "An imbalance is a description of resting interest right now, not a forecast.",
      ],
    },
    expected: {
      "bid-share": (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        const share = b.bidShareOfDepth ?? sumQty(b.bids) / (sumQty(b.bids) + sumQty(b.asks));
        return { value: share * 100, display: pct(share * 100), tolerance: { kind: "percent-points", value: 0.5 }, explanation: `Bids total ${fmtQty(b, sumQty(b.bids))} BTC and asks ${fmtQty(b, sumQty(b.asks))} BTC, so the bid share is ${pct(share * 100)} (best bid ${formatPrice(b, b.bestBid)}, best ask ${formatPrice(b, b.bestAsk)}).` };
      },
      "heavier-side": (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        const share = (b.bidShareOfDepth ?? sumQty(b.bids) / (sumQty(b.bids) + sumQty(b.asks))) * 100;
        const side = share > 55 ? "bids" : share < 45 ? "asks" : "balanced";
        const label = side === "bids" ? "Bids (buyers)" : side === "asks" ? "Asks (sellers)" : "Roughly balanced";
        return { value: side, display: label, tolerance: { kind: "exact" }, explanation: `With ${pct(share)} of displayed depth on the bid side, the book is ${side === "balanced" ? "roughly balanced" : `heavier on the ${side}`}.` };
      },
      predicts: (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        return { value: "no", display: "No: an imbalance is not a forecast", tolerance: { kind: "exact" }, explanation: `The quantities around ${formatPrice(b, b.bestBid)} / ${formatPrice(b, b.bestAsk)} are resting orders that can be cancelled before they trade. They describe current interest, not the next price.` };
      },
    },
  },
  {
    exercise: {
      id: "ob-price-time-priority",
      kind: "price-time-priority",
      skillIds: ["orderbook.price-time-priority", "orderbook.tick-lot"],
      title: "Who fills first?",
      instructions: "Apply price-time priority to the BTC/USDC book: better price first, then earlier arrival at the same price.",
      markets: [BTC_MARKET],
      questions: [
        {
          id: "same-price",
          prompt: "Two bids rest at the best bid. Order A for 0.01 BTC was placed first; order B for 0.50 BTC was placed later. A market sell of 0.01 BTC arrives. Which fills?",
          kind: "choice",
          options: [choice("a", "Order A (earlier at the same price)"), choice("b", "Order B (bigger size)"), choice("split", "Both, pro rata by size")],
        },
        {
          id: "better-price",
          prompt: "Order C bids one tick below the best bid and was placed an hour ago. Order D bids at the best bid and was placed a second ago. A market sell arrives. Which fills first?",
          kind: "choice",
          options: [choice("d", "Order D: higher price wins before time"), choice("c", "Order C: it has waited longer"), choice("either", "Either, chosen at random")],
        },
        { id: "max-bid", prompt: "What is the highest price a new bid can rest at without crossing the best ask (one tick below it)?", kind: "number", unit: "USDC" },
      ],
      hints: [
        "Price priority comes first: the best price on a side always trades before worse prices.",
        "At the same price, the order that arrived earlier is ahead in the queue; size does not jump the queue.",
        "Prices move in steps of one tick; a bid at the ask price would trade immediately instead of resting.",
      ],
    },
    expected: {
      "same-price": (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        return { value: "a", display: "Order A (earlier at the same price)", tolerance: { kind: "exact" }, explanation: `Both rest at the best bid ${formatPrice(b, b.bestBid)}; at equal price the earlier order is first in the queue, however small.` };
      },
      "better-price": (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        return { value: "d", display: "Order D: higher price wins before time", tolerance: { kind: "exact" }, explanation: `D bids ${formatPrice(b, b.bestBid)}, C bids ${formatPrice(b, b.bestBid - b.tickSize)}. The better price is served first; waiting time only matters among orders at the same price.` };
      },
      "max-bid": (books) => {
        const b = books[BTC_MARKET];
        if (!hasTop(b)) return null;
        const price = b.bestAsk - b.tickSize;
        return { value: price, display: formatPrice(b, price), tolerance: { kind: "tick" }, explanation: `Best ask is ${formatPrice(b, b.bestAsk)} and the tick is ${b.tickSize}, so the highest resting bid is ${formatPrice(b, price)} USDC.` };
      },
    },
  },
];

export function listOrderBookExercises(): OrderBookExercise[] {
  return DEFINITIONS.map((d) => d.exercise);
}

export function getOrderBookExercise(id: string): OrderBookExercise | undefined {
  return DEFINITIONS.find((d) => d.exercise.id === id)?.exercise;
}

/** exercise ids for a skill (used by the curriculum engine to route orderbook missions) */
export function orderBookExercisesForSkill(skillId: string): OrderBookExercise[] {
  return DEFINITIONS.filter((d) => d.exercise.skillIds.includes(skillId)).map((d) => d.exercise);
}

function toNumber(value: string | number | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[,$%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function withinTolerance(answer: number, expected: number, tolerance: Tolerance, book: OrderBookSnapshot | undefined): boolean {
  switch (tolerance.kind) {
    case "tick":
      return Math.abs(answer - expected) <= (book?.tickSize ?? 0) + 1e-9;
    case "percent-points":
      return Math.abs(answer - expected) <= tolerance.value + 1e-9;
    case "relative":
      return Math.abs(answer - expected) <= Math.abs(expected) * tolerance.value + 1e-12;
    case "exact":
      return answer === expected;
  }
}

function gradeQuestion(
  question: OrderBookExerciseQuestion,
  expected: Expected,
  answer: string | number | undefined,
  book: OrderBookSnapshot | undefined,
): { correct: boolean; expected: string; explanation: string } {
  if (question.kind === "choice") {
    const correct = typeof answer === "string" && answer === expected.value;
    return { correct, expected: expected.display, explanation: expected.explanation };
  }
  const n = toNumber(answer);
  if (n === null || typeof expected.value !== "number") return { correct: false, expected: expected.display, explanation: `No numeric answer given. ${expected.explanation}` };
  return { correct: withinTolerance(n, expected.value, expected.tolerance, book), expected: expected.display, explanation: expected.explanation };
}

export function gradeOrderBookExercise(
  exercise: OrderBookExercise,
  books: Record<string, OrderBookSnapshot>,
  answers: Record<string, string | number>,
): { score: number; results: OrderBookExerciseSubmitResponse["results"] } {
  const def = DEFINITIONS.find((d) => d.exercise.id === exercise.id);
  if (!def) throw new Error(`unknown order book exercise ${exercise.id}`);
  const primaryBook = books[exercise.markets[0]];
  const results: OrderBookExerciseSubmitResponse["results"] = [];
  for (const q of exercise.questions) {
    const expected = def.expected[q.id]?.(books) ?? null;
    if (!expected) {
      results.push({ questionId: q.id, correct: false, expected: "n/a", explanation: `The order book for ${exercise.markets.join(" / ")} is missing a top of book, so this question cannot be graded.` });
      continue;
    }
    const graded = gradeQuestion(q, expected, answers[q.id], primaryBook);
    results.push({ questionId: q.id, ...graded });
  }
  const correct = results.filter((r) => r.correct).length;
  const score = results.length === 0 ? 0 : Math.round((correct / results.length) * 100);
  return { score, results };
}
