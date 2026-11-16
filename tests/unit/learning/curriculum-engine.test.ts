import { describe, expect, it } from "vitest";
import { curriculum } from "@/lib/curriculum";
import { computeModuleProgress, computeSkillProgress, selectNextMission } from "@/lib/learning/curriculum-engine";
import type { DiagnosticResult } from "@/lib/types/learning";
import { NOW, iso, makeAttempt, makeKc, makeMastery, makeProfile, makeReview } from "./fixtures";

const profile = makeProfile();
const diagnostic: DiagnosticResult = {
  id: "d1",
  userId: "user-1",
  estimates: [],
  recommendedStartSkillId: "markets.price",
  recommendedStartModuleId: "markets",
  summary: "fixture",
  createdAt: iso(-10),
};
const empty = { profile, diagnostic, mastery: [], reviews: [], attempts: [], kcResults: [], now: NOW };

describe("selectNextMission priorities", () => {
  it("sends a learner without a diagnostic to onboarding", () => {
    const m = selectNextMission({ ...empty, diagnostic: null, profile: makeProfile({ onboardingCompletedAt: null }) });
    expect(m.kind).toBe("diagnostic");
    expect(m.href).toBe("/app/onboarding");
  });

  it("with no activity picks the first skill's lesson", () => {
    const m = selectNextMission(empty);
    expect(m).toMatchObject({ kind: "lesson", skillId: "markets.price", moduleId: "markets", href: "/app/learn/markets?skill=markets.price" });
    expect(m.reason).toMatch(/not started/i);
  });

  it("an overdue review wins over everything else", () => {
    const attempts = [
      makeAttempt({ id: "a1", scenarioId: "s1", skillIds: ["markets.volume"], score: 50, misconceptionIds: ["volume-implies-direction"], createdAt: iso(-3) }),
      makeAttempt({ id: "a2", scenarioId: "s2", skillIds: ["markets.volume"], score: 55, misconceptionIds: ["volume-implies-direction"], createdAt: iso(-2) }),
    ];
    const reviews = [makeReview({ id: "r-due", skillId: "markets.price", scheduledAt: iso(-1) }), makeReview({ id: "r-later", skillId: "markets.price", scheduledAt: iso(3) })];
    const m = selectNextMission({ ...empty, attempts, reviews, mastery: [makeMastery({ skillId: "markets.price", status: "practising" })] });
    expect(m.kind).toBe("review");
    expect(m.href).toBe("/app/review/r-due");
    expect(m.reason).toMatch(/due/);
  });

  it("a future review does not pre-empt the path", () => {
    const m = selectNextMission({ ...empty, reviews: [makeReview({ id: "r1", skillId: "markets.price", scheduledAt: iso(2) })] });
    expect(m.kind).toBe("lesson");
  });

  it("a recurring unresolved misconception steers to a scenario on its skill", () => {
    const attempts = [
      makeAttempt({ id: "a1", scenarioId: "s1", skillIds: ["markets.volume"], score: 50, misconceptionIds: ["volume-implies-direction"], createdAt: iso(-3) }),
      makeAttempt({ id: "a2", scenarioId: "s2", skillIds: ["markets.volume"], score: 55, misconceptionIds: ["volume-implies-direction"], createdAt: iso(-2) }),
    ];
    const m = selectNextMission({ ...empty, attempts, mastery: [makeMastery({ skillId: "markets.volume", status: "learning" })] });
    expect(m).toMatchObject({ kind: "scenario", skillId: "markets.volume", href: "/app/scenario-lab?skill=markets.volume" });
    expect(m.reason).toMatch(/Volume shows buying or selling/);
    expect(m.reason).toMatch(/2 times/);
  });

  it("a misconception followed by a clean attempt no longer steers", () => {
    const attempts = [
      makeAttempt({ id: "a1", scenarioId: "s1", skillIds: ["markets.volume"], score: 50, misconceptionIds: ["volume-implies-direction"], createdAt: iso(-3) }),
      makeAttempt({ id: "a2", scenarioId: "s2", skillIds: ["markets.volume"], score: 55, misconceptionIds: ["volume-implies-direction"], createdAt: iso(-2) }),
      makeAttempt({ id: "a3", scenarioId: "s3", skillIds: ["markets.volume"], score: 70, createdAt: iso(-1) }),
    ];
    const m = selectNextMission({ ...empty, attempts, mastery: [makeMastery({ skillId: "markets.volume", status: "practising" })] });
    expect(m.skillId).toBe("markets.price");
  });

  it("skips mastered skills and never assigns them outside a review", () => {
    const m = selectNextMission({ ...empty, mastery: [makeMastery({ skillId: "markets.price", status: "mastered" })] });
    expect(m).toMatchObject({ kind: "lesson", skillId: "markets.volume" });
  });

  it("after the lesson (one correct check) assigns a scenario", () => {
    const m = selectNextMission({
      ...empty,
      mastery: [makeMastery({ skillId: "markets.price", status: "learning" })],
      kcResults: [makeKc({ id: "k1", skillId: "markets.price", correct: true, createdAt: iso(-1) })],
    });
    expect(m).toMatchObject({ kind: "scenario", skillId: "markets.price" });
  });

  it("after one ≥80 attempt asks for a second scenario on different evidence", () => {
    const attempts = [makeAttempt({ id: "a1", scenarioId: "ex.markets.describe-snapshot__pack-1", skillIds: ["markets.price"], score: 85, createdAt: iso(-1) })];
    const m = selectNextMission({ ...empty, attempts, mastery: [makeMastery({ skillId: "markets.price", status: "practising" })] });
    expect(m.kind).toBe("scenario");
    expect(m.title).toMatch(/different evidence/);
    expect(m.reason).toMatch(/second score of 80/);
  });

  it("moves on when a skill only waits for its retention check", () => {
    const attempts = [
      makeAttempt({ id: "a1", scenarioId: "ex.markets.describe-snapshot__p1", skillIds: ["markets.price"], score: 85, createdAt: iso(-2) }),
      makeAttempt({ id: "a2", scenarioId: "ex.markets.two-quotes__p2", skillIds: ["markets.price"], score: 88, createdAt: iso(-1) }),
    ];
    const m = selectNextMission({ ...empty, attempts, mastery: [makeMastery({ skillId: "markets.price", status: "practising" })] });
    expect(m.skillId).toBe("markets.volume");
  });

  it("routes orderbook skills to the gym once written exercises are done", () => {
    // everything before the orderbook module in path order is mastered
    const mastery = [
      ...curriculum.skills.filter((s) => ["markets", "news", "etf", "indexes"].includes(s.category)).map((s) => makeMastery({ skillId: s.id, status: "mastered" })),
      makeMastery({ skillId: "orderbook.bid-ask", status: "practising" }),
    ];
    const attempts = [
      makeAttempt({ id: "a1", scenarioId: "ex.orderbook.cost-of-a-trade__p1", skillIds: ["orderbook.bid-ask"], score: 85, createdAt: iso(-2) }),
      makeAttempt({ id: "a2", scenarioId: "ex.orderbook.valid-order-and-queue__p2", skillIds: ["orderbook.bid-ask"], score: 88, createdAt: iso(-1) }),
    ];
    const m = selectNextMission({ ...empty, mastery, attempts, diagnostic: { ...diagnostic, recommendedStartModuleId: "orderbook" } });
    expect(m).toMatchObject({ kind: "orderbook", skillId: "orderbook.bid-ask", href: "/app/orderbook-gym?exercise=ob-identify-spread" });
  });
});

describe("computeSkillProgress / computeModuleProgress", () => {
  it("unlocks only skills whose prerequisites are practising+", () => {
    const skills = computeSkillProgress([makeMastery({ skillId: "markets.price", status: "practising" })]);
    const byId = new Map(skills.map((s) => [s.skill.id, s]));
    expect(byId.get("markets.price")?.unlocked).toBe(true);
    expect(byId.get("markets.volume")?.unlocked).toBe(true);
    expect(byId.get("markets.liquidity")?.unlocked).toBe(false);
    expect(byId.get("news.facts-vs-opinions")?.unlocked).toBe(false);
  });

  it("a diagnostic placing the learner at news unlocks news and treats markets as met", () => {
    const skills = computeSkillProgress([], { diagnostic: { ...diagnostic, recommendedStartModuleId: "news", recommendedStartSkillId: "news.facts-vs-opinions" } });
    const byId = new Map(skills.map((s) => [s.skill.id, s]));
    expect(byId.get("news.facts-vs-opinions")?.unlocked).toBe(true);
    expect(byId.get("etf.flows")?.unlocked).toBe(false);
  });

  it("module progress is the share of practising+ skills and gates on prerequisites", () => {
    const mastery = ["markets.price", "markets.volume", "markets.market-cap"].map((s) => makeMastery({ skillId: s, status: "practising" }));
    const modules = computeModuleProgress(computeSkillProgress(mastery));
    const markets = modules.find((m) => m.module.id === "markets");
    const news = modules.find((m) => m.module.id === "news");
    const reasoning = modules.find((m) => m.module.id === "reasoning");
    expect(markets?.progress).toBeCloseTo(0.5);
    expect(markets?.unlocked).toBe(true);
    expect(news?.unlocked).toBe(true);
    expect(reasoning?.unlocked).toBe(false);
  });
});
