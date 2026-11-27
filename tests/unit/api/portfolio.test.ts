/**
 * /api/portfolio routes in local mode. Market data comes from the captured
 * SoDEX Wealth fixtures (DEMO_MODE: no network); grading runs the rules
 * evaluator (no OpenAI key).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { asUser, body, get, noParams, okData, post, setupLocalEnv, withId } from "./helpers";
import type { PortfolioResponse, PortfolioReviewResponse, ProgressAttemptsResponse } from "@/lib/types";

let cleanup: () => Promise<void>;
beforeAll(async () => {
  ({ cleanup } = await setupLocalEnv());
});
afterAll(async () => cleanup());
beforeEach(async () => {
  (await import("@/lib/server/rate-limit")).resetRateLimits();
  asUser({ id: "local-demo-user", email: null });
});

const RATIONALE =
  "Most of the weight sits in a broad US equity fund so no single company drives the result. The tech fund overlaps with it, so I kept it smaller. I would rethink this if fees rose or if one fund grew past half the weight.";

const valid = () => ({
  name: "Steady mix",
  holdings: [
    { fundId: "vVOO", weightPct: 60 },
    { fundId: "vQQQ", weightPct: 40 },
  ],
  strategy: "weekly-dca" as const,
  rationale: RATIONALE,
});

async function routes() {
  return {
    list: await import("@/app/api/portfolio/route"),
    one: await import("@/app/api/portfolio/[id]/route"),
    review: await import("@/app/api/portfolio/[id]/review/route"),
  };
}

describe("portfolio validation (400)", () => {
  const cases: Array<[string, (v: ReturnType<typeof valid>) => unknown]> = [
    ["no holdings", (v) => ({ ...v, holdings: [] })],
    ["more than 8 holdings", (v) => ({ ...v, holdings: Array.from({ length: 9 }, (_, i) => ({ fundId: `f${i}`, weightPct: i === 0 ? 20 : 10 })) })],
    ["duplicate fund ids", (v) => ({ ...v, holdings: [{ fundId: "vVOO", weightPct: 50 }, { fundId: "vVOO", weightPct: 50 }] })],
    ["weights not summing to 100", (v) => ({ ...v, holdings: [{ fundId: "vVOO", weightPct: 60 }, { fundId: "vQQQ", weightPct: 30 }] })],
    ["fractional weight", (v) => ({ ...v, holdings: [{ fundId: "vVOO", weightPct: 60.5 }, { fundId: "vQQQ", weightPct: 39.5 }] })],
    ["zero weight", (v) => ({ ...v, holdings: [{ fundId: "vVOO", weightPct: 100 }, { fundId: "vQQQ", weightPct: 0 }] })],
    ["weight over 100", (v) => ({ ...v, holdings: [{ fundId: "vVOO", weightPct: 101 }] })],
    ["short rationale", (v) => ({ ...v, rationale: "Too short to grade." })],
    ["rationale over 4000", (v) => ({ ...v, rationale: "x".repeat(4001) })],
    ["empty name", (v) => ({ ...v, name: "   " })],
    ["name over 80", (v) => ({ ...v, name: "n".repeat(81) })],
    ["unknown strategy", (v) => ({ ...v, strategy: "all-in" })],
    ["fund not on the Wealth board", (v) => ({ ...v, holdings: [{ fundId: "vVOO", weightPct: 50 }, { fundId: "NOTAFUND", weightPct: 50 }] })],
  ];

  it.each(cases)("rejects %s", async (_label, mutate) => {
    const { list } = await routes();
    const res = await list.POST(post("/api/portfolio", mutate(valid())), noParams);
    expect(res.status).toBe(400);
    expect(await body(res)).toMatchObject({ ok: false, error: { code: "validation_error" } });
  });

  it("rejects malformed JSON", async () => {
    const { list } = await routes();
    expect((await list.POST(post("/api/portfolio", "{nope"), noParams)).status).toBe(400);
  });

  it("accepts exactly 8 holdings and the 40-character rationale boundary", async () => {
    const { list } = await routes();
    const { demoWealthBoard } = await import("@/lib/market-data");
    const ids = demoWealthBoard().funds.map((f) => f.fundId).slice(0, 8);
    expect(ids).toHaveLength(8);
    const holdings = ids.map((fundId, i) => ({ fundId, weightPct: i === 0 ? 30 : 10 }));
    const res = await list.POST(post("/api/portfolio", { ...valid(), holdings, rationale: "r".repeat(40) }), noParams);
    expect(res.status).toBe(200);
  });
});

describe("portfolio create → list → update → review", () => {
  let id = "";

  it("creates a portfolio with a deterministic analysis", async () => {
    const { list } = await routes();
    const created = await okData<PortfolioResponse>(await list.POST(post("/api/portfolio", valid()), noParams));
    id = created.portfolio.id;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.portfolio).toMatchObject({ userId: "local-demo-user", name: "Steady mix", strategy: "weekly-dca" });
    expect(created.analysis.portfolioId).toBe(id);
    expect(created.analysis.concentrationHhi).toBe(60 * 60 + 40 * 40);
    expect(created.analysis.largestWeightPct).toBe(60);
    expect(created.analysis.provenance.every((p) => p.kind === "demo")).toBe(true);
  });

  it("lists the learner's portfolios with analyses", async () => {
    const { list } = await routes();
    const all = await okData<PortfolioResponse[]>(await list.GET(get("/api/portfolio"), noParams));
    expect(all.map((p) => p.portfolio.id)).toContain(id);
    expect(all.every((p) => p.analysis.portfolioId === p.portfolio.id)).toBe(true);
  });

  it("updates in place, keeping createdAt", async () => {
    const { one } = await routes();
    const before = await okData<PortfolioResponse[]>(await (await routes()).list.GET(get("/api/portfolio"), noParams));
    const createdAt = before.find((p) => p.portfolio.id === id)!.portfolio.createdAt;
    const updated = await okData<PortfolioResponse>(
      await one.PUT(post(`/api/portfolio/${id}`, { ...valid(), name: "Rebalanced", holdings: [{ fundId: "vVOO", weightPct: 100 }] }, "PUT"), withId(id)),
    );
    expect(updated.portfolio).toMatchObject({ id, name: "Rebalanced", createdAt });
    expect(updated.analysis.concentrationHhi).toBe(10000);
    expect((await one.PUT(post(`/api/portfolio/${id}`, { ...valid(), name: "" }, "PUT"), withId(id))).status).toBe(400);
  });

  it("reviews: grades the rationale, saves the attempt with templateId, updates mastery and logs activity", async () => {
    const { review } = await routes();
    const res = await okData<PortfolioReviewResponse>(await review.POST(post(`/api/portfolio/${id}/review`, {}), withId(id)));
    expect(res.portfolio.id).toBe(id);
    expect(res.attempt.templateId).toBe("ex.wealth.portfolio-review");
    expect(res.attempt.submittedAnswer).toBe(RATIONALE);
    expect(res.evaluation.evaluatorMode).toBe("rules");
    expect(res.evaluation.totalScore).toBeGreaterThanOrEqual(0);
    expect(res.masteryUpdates.length).toBeGreaterThan(0);
    expect(res.masteryUpdates.every((m) => m.skillId.startsWith("wealth.") || res.attempt.skillIds.includes(m.skillId))).toBe(true);
    expect(res.nextMission).toBeTruthy();

    const { getRepository } = await import("@/lib/db");
    const repo = await getRepository();
    const scenario = await repo.getScenario(res.attempt.scenarioId);
    expect(scenario?.templateId).toBe("ex.wealth.portfolio-review");
    expect(scenario?.evidence.wealthFunds?.length).toBeGreaterThan(0);
    const activity = await repo.listActivity("local-demo-user", 5);
    expect(activity[0]).toMatchObject({ kind: "portfolio", refId: id });

    const attempts = await okData<ProgressAttemptsResponse>(await (await import("@/app/api/progress/attempts/route")).GET(get("/api/progress/attempts"), noParams));
    expect(JSON.stringify(attempts)).toContain(res.attempt.id);
  });

  it("keeps working when DCA history is unavailable (analysis marks it missing)", async () => {
    const { getMarketServices } = await import("@/lib/market-data");
    const spy = vi.spyOn(getMarketServices().wealth, "getDca").mockRejectedValue(new Error("upstream down"));
    try {
      const { list } = await routes();
      const created = await okData<PortfolioResponse>(await list.POST(post("/api/portfolio", valid()), noParams));
      expect(created.analysis.weightedDcaReturn1YPct).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it("isolates portfolios between learners", async () => {
    const { list, one, review } = await routes();
    asUser({ id: "intruder", email: null });
    expect(await okData<PortfolioResponse[]>(await list.GET(get("/api/portfolio"), noParams))).toEqual([]);
    expect((await one.PUT(post(`/api/portfolio/${id}`, valid(), "PUT"), withId(id))).status).toBe(404);
    expect((await review.POST(post(`/api/portfolio/${id}/review`, {}), withId(id))).status).toBe(404);
    asUser({ id: "local-demo-user", email: null });
    const mine = await okData<PortfolioResponse[]>(await list.GET(get("/api/portfolio"), noParams));
    expect(mine.find((p) => p.portfolio.id === id)?.portfolio.name).toBe("Rebalanced");
  });

  it("answers 404 for a non-uuid id and 401 without a learner", async () => {
    const { one, review, list } = await routes();
    expect((await one.PUT(post("/api/portfolio/abc", valid(), "PUT"), withId("abc"))).status).toBe(404);
    asUser(null);
    expect((await list.GET(get("/api/portfolio"), noParams)).status).toBe(401);
    expect((await list.POST(post("/api/portfolio", valid()), noParams)).status).toBe(401);
    expect((await review.POST(post(`/api/portfolio/${id}/review`, {}), withId(id))).status).toBe(401);
  });

  it("rate-limits reviews like scenario attempts", async () => {
    const { review } = await routes();
    const { RATE_LIMITS } = await import("@/lib/server/rate-limit");
    const { consume } = await import("@/lib/server/rate-limit");
    // drain the learner's scenarios bucket, then the next review is refused
    for (let i = 0; i < RATE_LIMITS.scenarios.limit; i++) consume("scenarios:local-demo-user", RATE_LIMITS.scenarios);
    const res = await review.POST(post(`/api/portfolio/${id}/review`, {}), withId(id));
    expect(res.status).toBe(429);
  });
});
