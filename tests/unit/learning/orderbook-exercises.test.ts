import { describe, expect, it } from "vitest";
import { gradeOrderBookExercise, getOrderBookExercise, listOrderBookExercises, orderBookExercisesForSkill } from "@/lib/learning/orderbook-exercises";
import { btcBook, ethBook } from "./fixtures";

const books = { vBTC_vUSDC: btcBook, vETH_vUSDC: ethBook };
const ex = (id: string) => {
  const e = getOrderBookExercise(id);
  if (!e) throw new Error(id);
  return e;
};

describe("listOrderBookExercises", () => {
  it("has the six kinds and every exercise carries three hints and real skill ids", () => {
    const all = listOrderBookExercises();
    expect(all.map((e) => e.kind).sort()).toEqual(["compare-liquidity", "identify-spread", "interpret-depth", "price-time-priority", "recognise-imbalance", "spot-vs-perps"]);
    for (const e of all) {
      expect(e.hints).toHaveLength(3);
      expect(e.questions.length).toBeGreaterThanOrEqual(3);
    }
    expect(orderBookExercisesForSkill("orderbook.spread").map((e) => e.id)).toContain("ob-identify-spread");
  });
});

describe("fixture book sanity", () => {
  it("normalised the SoDEX fixture as expected", () => {
    expect(btcBook.bestBid).toBe(75576);
    expect(btcBook.bestAsk).toBe(75577);
    expect(btcBook.bidShareOfDepth).toBeCloseTo(0.471, 2);
    expect(ethBook.bestBid).toBe(2223.3);
    expect(ethBook.bestAsk).toBe(2223.4);
  });
});

describe("gradeOrderBookExercise", () => {
  it("identify-spread: exact answers score 100 and explanations cite the real quotes", () => {
    const { score, results } = gradeOrderBookExercise(ex("ob-identify-spread"), books, { "best-bid": 75576, "best-ask": "75,577", spread: 1, "spread-meaning": "round-trip" });
    expect(score).toBe(100);
    expect(results.every((r) => r.correct)).toBe(true);
    expect(results[0].explanation).toContain("75576");
    expect(results[2].explanation).toContain("75577");
  });

  it("prices tolerate one tick, not two; choices are exact", () => {
    const { results } = gradeOrderBookExercise(ex("ob-identify-spread"), books, { "best-bid": 75575, "best-ask": 75579, spread: 2, "spread-meaning": "fee" });
    expect(results.map((r) => r.correct)).toEqual([true, false, true, false]);
    expect(results[3].expected).toMatch(/buying at the ask/);
  });

  it("interpret-depth grades quantities with 0.5 % tolerance and depth questions", () => {
    const cum5 = btcBook.bids.slice(0, 5).reduce((s, l) => s + l.quantity, 0);
    const { results } = gradeOrderBookExercise(ex("ob-interpret-depth"), books, { "cum-bid-5": cum5 * 1.004, "sell-fill-price": "level-3", "depth-static": "fixed" });
    expect(results.map((r) => r.correct)).toEqual([true, true, false]);
    const off = gradeOrderBookExercise(ex("ob-interpret-depth"), books, { "cum-bid-5": cum5 * 1.02 });
    expect(off.results[0].correct).toBe(false);
    expect(off.results[1].explanation).toContain(String(btcBook.bids[2].price));
  });

  it("compare-liquidity picks BTC/USDC for the tighter relative spread and rejects the units trap", () => {
    const { score, results } = gradeOrderBookExercise(ex("ob-compare-liquidity"), books, { "tighter-spread": "vBTC_vUSDC", "more-notional": "vBTC_vUSDC", "units-trap": "yes-coins" });
    expect(results[0].correct).toBe(true);
    expect(results[0].explanation).toContain("2223.4");
    expect(results[1].correct).toBe(true);
    expect(results[2].correct).toBe(false);
    expect(score).toBe(67);
  });

  it("recognise-imbalance: 0.5 percentage-point tolerance on the bid share", () => {
    const share = (btcBook.bidShareOfDepth ?? 0) * 100;
    const ok = gradeOrderBookExercise(ex("ob-recognise-imbalance"), books, { "bid-share": share + 0.4, "heavier-side": "balanced", predicts: "no" });
    expect(ok.score).toBe(100);
    const bad = gradeOrderBookExercise(ex("ob-recognise-imbalance"), books, { "bid-share": share + 0.9, "heavier-side": "bids", predicts: "yes-up" });
    expect(bad.score).toBe(0);
    expect(bad.results[0].explanation).toMatch(/47\.\d%/);
  });

  it("price-time-priority: earlier order wins at the same price, better price beats time, max bid is one tick under the ask", () => {
    const { score, results } = gradeOrderBookExercise(ex("ob-price-time-priority"), books, { "same-price": "a", "better-price": "d", "max-bid": 75576 });
    expect(score).toBe(100);
    expect(results[2].explanation).toContain("75577");
    const big = gradeOrderBookExercise(ex("ob-price-time-priority"), books, { "same-price": "b" });
    expect(big.results[0].correct).toBe(false);
    expect(big.results[0].explanation).toContain("75576");
  });

  it("missing book → nothing gradeable, score 0", () => {
    const { score, results } = gradeOrderBookExercise(ex("ob-identify-spread"), {}, { "best-bid": 1 });
    expect(score).toBe(0);
    expect(results.every((r) => !r.correct && r.expected === "n/a")).toBe(true);
  });
});

describe("spot-vs-perps (real ANT fixtures)", () => {
  // imported lazily to keep the BTC/ETH suite above independent of wave 2 fixtures
  const load = async () => (await import("./wealth-fixtures"));

  it("grades spreads to 2 dp, tighter book and top-10 quote value against the books passed in", async () => {
    const { antSpotBook, antPerpBook } = await load();
    const ex = getOrderBookExercise("ob-spot-vs-perps");
    if (!ex) throw new Error("missing ob-spot-vs-perps");
    expect(ex.kind).toBe("spot-vs-perps");
    expect(ex.markets).toEqual(["vANT_vUSDC", "perps:ANT-USD"]);
    const books = { vANT_vUSDC: antSpotBook, "perps:ANT-USD": antPerpBook };
    // spot 85.93 / 86.12 → 0.2209 %; perp 86.08 / 86.09 → 0.0116 %; top-10 value spot ≈ 16,609 vs perp ≈ 3,889
    const { score, results } = gradeOrderBookExercise(ex, books, { "spot-spread-pct": "0.22", "perps-spread-pct": 0.01, tighter: "perps:ANT-USD", "more-depth": "vANT_vUSDC", "tighter-not-better": "size-walks-book" });
    expect(score).toBe(100);
    expect(results[0].expected).toBe("0.22%");
    expect(results[0].explanation).toContain("86.12");
    expect(results[0].explanation).toContain("85.93");
    expect(results[1].expected).toBe("0.01%");
    expect(results[2].explanation).toContain("86.09");
    expect(results[3].explanation).toMatch(/spot ≈ 6,038 bids \+ 10,571 asks = 16,609 USDC; perpetual ≈ 1,857 \+ 2,032 = 3,889 USDC/);
    expect(results[4].explanation).toContain("2.89");
    expect(results[4].explanation).toMatch(/funding/);
  });

  it("rejects answers off by more than 0.01 points and the 'tighter is always cheaper' choice", async () => {
    const { antSpotBook, antPerpBook } = await load();
    const ex = getOrderBookExercise("ob-spot-vs-perps")!;
    const { results, score } = gradeOrderBookExercise(ex, { vANT_vUSDC: antSpotBook, "perps:ANT-USD": antPerpBook }, { "spot-spread-pct": 0.25, "perps-spread-pct": 0.02, tighter: "vANT_vUSDC", "more-depth": "perps:ANT-USD", "tighter-not-better": "always-better" });
    expect(results.map((r) => r.correct)).toEqual([false, true, false, false, false]);
    expect(score).toBe(20);
  });

  it("grades each exercise against its own markets and names a missing book", async () => {
    const { antSpotBook } = await load();
    const ex = getOrderBookExercise("ob-spot-vs-perps")!;
    // BTC books are supplied but irrelevant; the perp book is missing
    const { score, results } = gradeOrderBookExercise(ex, { ...books, vANT_vUSDC: antSpotBook }, { tighter: "perps:ANT-USD" });
    expect(score).toBe(0);
    expect(results).toHaveLength(5);
    expect(results[0].explanation).toMatch(/ANT-USD perpetual book was missing/);
    // existing BTC exercises still grade on BTC even when ANT books are present too
    const btc = gradeOrderBookExercise(getOrderBookExercise("ob-identify-spread")!, { ...books, vANT_vUSDC: antSpotBook }, { "best-bid": 75576 });
    expect(btc.results[0].correct).toBe(true);
    const noBtc = gradeOrderBookExercise(getOrderBookExercise("ob-identify-spread")!, { vANT_vUSDC: antSpotBook }, { "best-bid": 85.93 });
    expect(noBtc.results[0].explanation).toMatch(/BTC\/USDC book was missing/);
  });

  it("orderbook.spot-vs-perps maps to the new gym exercise", () => {
    expect(orderBookExercisesForSkill("orderbook.spot-vs-perps").map((e) => e.id)).toEqual(["ob-spot-vs-perps"]);
  });
});
