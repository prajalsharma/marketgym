import { describe, expect, it } from "vitest";
import { curriculum } from "@/lib/curriculum";
import { HREF_PORTFOLIO, computeModuleProgress, computeSkillProgress, isPortfolioSkill, selectNextMission, wealthLabHrefForSkill } from "@/lib/learning/curriculum-engine";
import { pickTemplateForSkill } from "@/lib/learning/scenario-generator";
import type { DiagnosticResult, MasteryRecord } from "@/lib/types/learning";
import { NOW, iso, makeAttempt, makeMastery, makeMemory, makeProfile } from "./fixtures";

const diagnostic: DiagnosticResult = { id: "d1", userId: "user-1", estimates: [], recommendedStartSkillId: "markets.price", recommendedStartModuleId: "markets", summary: "fixture", createdAt: iso(-10) };
const base = { profile: makeProfile(), diagnostic, reviews: [], attempts: [], kcResults: [], now: NOW };

const skillsOf = (moduleId: string) => curriculum.modules.find((m) => m.id === moduleId)!.skillIds;
/** every skill of the given modules mastered */
const mastered = (...moduleIds: string[]): MasteryRecord[] => moduleIds.flatMap((m) => skillsOf(m).map((s) => makeMastery({ skillId: s, status: "mastered" })));

describe("wealth module gating", () => {
  it("stays locked until etf and indexes are at least half practising, even with markets/news mastered", () => {
    const progress = computeSkillProgress(mastered("markets", "news"));
    const wealth = progress.filter((p) => p.skill.category === "wealth");
    expect(wealth.every((p) => !p.unlocked)).toBe(true);
    const mod = computeModuleProgress(progress).find((m) => m.module.id === "wealth");
    expect(mod?.unlocked).toBe(false);
  });

  it("with etf done but indexes not, wealth is still locked (both prerequisites count)", () => {
    const progress = computeSkillProgress(mastered("markets", "news", "etf"));
    expect(progress.find((p) => p.skill.id === "wealth.fund-types")?.unlocked).toBe(false);
  });

  it("once every earlier module is mastered, the next mission is the first wealth lesson", () => {
    const m = selectNextMission({ ...base, mastery: mastered("markets", "news", "etf", "indexes", "orderbook", "reasoning") });
    expect(m).toMatchObject({ kind: "lesson", skillId: "wealth.fund-types", moduleId: "wealth", href: "/app/learn/wealth?skill=wealth.fund-types" });
    expect(m.reason).toMatch(/Wealth lab/);
  });
});

describe("wave 2 routes", () => {
  const before = mastered("markets", "news", "etf", "indexes", "orderbook", "reasoning");
  const wealthDone = (except: string[]) =>
    skillsOf("wealth").filter((s) => !except.includes(s)).map((s) => makeMastery({ skillId: s, status: "mastered" }));

  it("portfolio skills route to /app/portfolio and the lab never serves the portfolio template", () => {
    expect(isPortfolioSkill("wealth.diversification")).toBe(true);
    expect(isPortfolioSkill("wealth.fees")).toBe(true);
    expect(isPortfolioSkill("wealth.nav-vs-price")).toBe(false);
    const m = selectNextMission({ ...base, mastery: [...before, ...wealthDone(["wealth.fees"]), makeMastery({ skillId: "wealth.fees", status: "learning" })] });
    expect(m).toMatchObject({ kind: "scenario", skillId: "wealth.fees", href: HREF_PORTFOLIO });
    expect(m.title).toMatch(/Practice portfolio/);
    expect(() => pickTemplateForSkill("wealth.fees", [], makeMemory())).toThrow(/no exercise template/);
    expect(pickTemplateForSkill("wealth.dca", [], makeMemory()).id).toBe("ex.wealth.dca");
  });

  it("a learner practising a wealth reading skill gets a scenario-lab mission", () => {
    const m = selectNextMission({ ...base, mastery: [...before, ...wealthDone(["wealth.yield-apy"]), makeMastery({ skillId: "wealth.yield-apy", status: "learning" })] });
    expect(m).toMatchObject({ kind: "scenario", skillId: "wealth.yield-apy", href: "/app/scenario-lab?skill=wealth.yield-apy" });
    expect(wealthLabHrefForSkill("wealth.yield-apy")).toBe("/app/wealth?fund=Morpho-Earn");
    expect(wealthLabHrefForSkill("wealth.nav-vs-price")).toBe("/app/wealth?fund=antb");
    expect(wealthLabHrefForSkill("wealth.incentives")).toBeNull();
  });

  it("orderbook.spot-vs-perps routes to its gym exercise once its written scenarios are done", () => {
    const attempts = [
      makeAttempt({ id: "a1", scenarioId: "s1", skillIds: ["orderbook.spot-vs-perps"], score: 85, createdAt: iso(-2) }),
      makeAttempt({ id: "a2", scenarioId: "s2", skillIds: ["orderbook.spot-vs-perps"], score: 90, createdAt: iso(-1) }),
    ];
    const mastery = before.filter((r) => r.skillId !== "orderbook.spot-vs-perps").concat(makeMastery({ skillId: "orderbook.spot-vs-perps", status: "practising" }));
    const m = selectNextMission({ ...base, mastery, attempts });
    expect(m).toMatchObject({ kind: "orderbook", skillId: "orderbook.spot-vs-perps", href: "/app/orderbook-gym?exercise=ob-spot-vs-perps" });
  });
});
