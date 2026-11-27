import { describe, expect, it } from "vitest";
import { curriculum, getExerciseTemplate, getMisconception, getModule, getModuleForSkill, listExerciseTemplates, listKnowledgeChecks } from "@/lib/curriculum";
import { isKnownEvidenceToken, validateCurriculum } from "@/lib/curriculum/validate";

const WAVE2_SKILLS = ["markets.trading-hours", "orderbook.spot-vs-perps", "indexes.index-nav", "wealth.fund-types", "wealth.nav-vs-price", "wealth.fees", "wealth.yield-apy", "wealth.dca", "wealth.diversification", "wealth.incentives"];

describe("wave 2 curriculum", () => {
  it("passes the validator", () => {
    expect(validateCurriculum()).toEqual([]);
  });

  it("adds the wealth module at sequence 7 after etf and indexes", () => {
    const w = getModule("wealth");
    expect(w).toMatchObject({ id: "wealth", sequence: 7, prerequisiteModuleIds: ["etf", "indexes"] });
    expect(w?.skillIds).toEqual(WAVE2_SKILLS.filter((s) => s.startsWith("wealth.")));
    expect(curriculum.path.moduleIds.at(-1)).toBe("wealth");
    for (const s of WAVE2_SKILLS) {
      expect(getModuleForSkill(s)?.id).toBe(s.split(".")[0]);
      expect(listKnowledgeChecks(s).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("has the portfolio-review template with its four questions and the required scenarios", () => {
    const t = getExerciseTemplate("ex.wealth.portfolio-review");
    expect(t?.questions).toHaveLength(4);
    expect(t?.evidenceRequirements).toContain("wealth:board");
    for (const skill of ["wealth.nav-vs-price", "wealth.yield-apy", "wealth.dca", "wealth.incentives", "markets.trading-hours", "orderbook.spot-vs-perps"]) {
      expect(listExerciseTemplates({ skillId: skill }).length, skill).toBeGreaterThanOrEqual(1);
    }
    expect(getExerciseTemplate("ex.orderbook.spot-vs-perps")?.evidenceRequirements).toEqual(["orderbook:vANT_vUSDC", "orderbook:perps:ANT-USD"]);
  });

  it("marks the three contract misconceptions critical", () => {
    for (const id of ["past-return-predicts", "apy-is-guaranteed", "incentive-volume-is-demand"]) expect(getMisconception(id)?.critical).toBe(true);
    for (const id of ["nav-equals-price", "dca-always-wins", "feed-shows-typical-reward", "more-funds-is-diversified", "fees-dont-matter", "perps-price-is-spot-price", "stale-price-is-current"]) expect(getMisconception(id)).toBeDefined();
  });

  it("accepts the new evidence tokens and rejects malformed ones", () => {
    for (const t of ["wealth:board", "wealth:fund:antb", "wealth:price:vQQQ:3M", "wealth:dca:vVOO:1Y", "rewards:incentives", "rewards:feed", "orderbook:perps:ANT-USD", "orderbook:vANT_vUSDC"]) expect(isKnownEvidenceToken(t), t).toBe(true);
    for (const t of ["wealth:price:vQQQ:5Y", "wealth:dca:vVOO:1W", "rewards:all", "wealth:fund:"]) expect(isKnownEvidenceToken(t), t).toBe(false);
  });
});
