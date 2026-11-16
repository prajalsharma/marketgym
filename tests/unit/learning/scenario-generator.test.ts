import { describe, expect, it } from "vitest";
import { getExerciseTemplate, listExerciseTemplates } from "@/lib/curriculum";
import { buildScenario, makeScenarioId, pickTemplateForSkill, templateIdFromScenarioId } from "@/lib/learning/scenario-generator";
import { iso, makeAttempt, makeMemory, makePack } from "./fixtures";

describe("buildScenario", () => {
  it("copies the template, freezes the pack and describes evidence by counts and kinds only", () => {
    const template = getExerciseTemplate("ex.markets.describe-snapshot");
    if (!template) throw new Error("template missing");
    const pack = makePack();
    const scenario = buildScenario(template, pack, makeScenarioId(template.id, pack.id));
    expect(scenario.id).toBe("ex.markets.describe-snapshot__pack-1");
    expect(scenario.templateId).toBe(template.id);
    expect(scenario.questions.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
    expect(scenario.questions[0].prompt).toBe(template.questions[0]);
    expect(scenario.evidence).toBe(pack);
    expect(scenario.description).toContain("2 market snapshots (BTC, ETH)");
    expect(scenario.description).toContain("1 news item");
    expect(scenario.description).toContain("1 order book (BTC/USDC)");
    expect(scenario.description).toMatch(/demo \(fixture, not real-time\)/);
    expect(scenario.description).toMatch(/frozen/);
    expect(scenario.description).not.toMatch(/75,?576/);
  });
});

describe("templateIdFromScenarioId", () => {
  it("round-trips ids and falls back to prefix matching", () => {
    const known = ["ex.markets.describe-snapshot", "ex.markets.two-quotes"];
    expect(templateIdFromScenarioId(makeScenarioId("ex.markets.two-quotes", "p9"), known)).toBe("ex.markets.two-quotes");
    expect(templateIdFromScenarioId("ex.markets.two-quotes-20261106", known)).toBe("ex.markets.two-quotes");
    expect(templateIdFromScenarioId("random-uuid", known)).toBeNull();
  });
});

describe("pickTemplateForSkill", () => {
  const templates = listExerciseTemplates({ skillId: "markets.volume" });

  it("has two templates to choose from for markets.volume", () => {
    expect(templates.length).toBeGreaterThanOrEqual(2);
  });

  it("prefers a template the learner has not attempted", () => {
    const first = pickTemplateForSkill("markets.volume", [], makeMemory());
    const attempts = [makeAttempt({ id: "a1", scenarioId: makeScenarioId(first.id, "p1"), skillIds: ["markets.volume"], score: 70, createdAt: iso(-1) })];
    const second = pickTemplateForSkill("markets.volume", attempts, makeMemory());
    expect(second.id).not.toBe(first.id);
  });

  it("prefers templates that target a recurring misconception", () => {
    const target = templates.find((t) => t.rubric.commonMisconceptionIds.length > 0);
    if (!target) throw new Error("no template with misconceptions");
    const mis = target.rubric.commonMisconceptionIds[0];
    const memory = makeMemory({ recurringMisconceptions: [{ misconceptionId: mis, count: 3, lastSeenAt: iso(-1) }] });
    const picked = pickTemplateForSkill("markets.volume", [], memory);
    expect(picked.rubric.commonMisconceptionIds).toContain(mis);
  });

  it("falls back to the least-attempted template when all were attempted", () => {
    const attempts = templates.flatMap((t, i) =>
      Array.from({ length: i + 1 }, (_, j) => makeAttempt({ id: `${t.id}-${j}`, scenarioId: makeScenarioId(t.id, `p${j}`), skillIds: ["markets.volume"], score: 70, createdAt: iso(-1) })),
    );
    expect(pickTemplateForSkill("markets.volume", attempts, makeMemory()).id).toBe(templates[0].id);
  });

  it("throws for a skill with no templates", () => {
    expect(() => pickTemplateForSkill("not.a-skill", [], makeMemory())).toThrow(/no exercise template/);
  });
});
