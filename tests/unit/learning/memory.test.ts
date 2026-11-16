import { describe, expect, it } from "vitest";
import { buildMemory, recurringMisconceptions } from "@/lib/learning/memory";
import { iso, makeAttempt, makeKc, makeMastery, makeProfile } from "./fixtures";

describe("buildMemory", () => {
  it("counts recurring misconceptions (≥2) across attempts and knowledge checks", () => {
    const attempts = [
      makeAttempt({ id: "a1", scenarioId: "s1", skillIds: ["markets.volume"], score: 50, misconceptionIds: ["volume-implies-direction"], createdAt: iso(-3) }),
      makeAttempt({ id: "a2", scenarioId: "s2", skillIds: ["markets.volume"], score: 55, misconceptionIds: ["liquidity-equals-volume"], createdAt: iso(-2) }),
    ];
    const kcs = [makeKc({ id: "k1", skillId: "markets.volume", correct: false, misconceptionId: "volume-implies-direction", createdAt: iso(-1) })];
    const rec = recurringMisconceptions(attempts, kcs);
    expect(rec).toEqual([{ misconceptionId: "volume-implies-direction", count: 2, lastSeenAt: iso(-1) }]);
  });

  it("derives weak, understood, style and recent scores purely from records", () => {
    const attempts = Array.from({ length: 12 }, (_, i) =>
      makeAttempt({ id: `a${i}`, scenarioId: `s${i}`, skillIds: ["markets.price"], score: 40 + i, createdAt: iso(-12 + i) }),
    );
    const memory = buildMemory({
      profile: makeProfile({ preferredLearningStyle: "examples" }),
      mastery: [
        makeMastery({ skillId: "markets.price", status: "learning", score: 30 }),
        makeMastery({ skillId: "markets.volume", status: "practising", score: 80 }),
        makeMastery({ skillId: "markets.market-cap", status: "mastered", score: 95 }),
        makeMastery({ skillId: "markets.liquidity", status: "not-started", score: 0 }),
      ],
      attempts,
      kcResults: [],
    });
    expect(memory.weakSkillIds).toEqual(["markets.price"]);
    expect(memory.understoodSkillIds).toEqual(["markets.volume", "markets.market-cap"]);
    expect(memory.preferredStyle).toBe("examples");
    expect(memory.recentScores).toEqual([42, 43, 44, 45, 46, 47, 48, 49, 50, 51]);
    expect(memory.recurringMisconceptions).toEqual([]);
  });
});
