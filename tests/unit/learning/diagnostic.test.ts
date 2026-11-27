import { describe, expect, it } from "vitest";
import { curriculum, getMisconception } from "@/lib/curriculum";
import { OPEN_QUESTION_ID, diagnosticChoiceSpecs, getDiagnosticQuestions, runDiagnostic, scoreOpenAnswerByRules } from "@/lib/learning/diagnostic";
import type { DiagnosticAnswer } from "@/lib/types/learning";
import { NOW, fakeModel, makeProfile } from "./fixtures";

const STRONG_OPEN =
  "High volume tells you a lot of value changed hands and that activity was unusual compared with its recent average. It does not tell you which way the price will go or who was buying, because every trade has one buyer and one seller.";

function answersWith(choice: (moduleId: string) => string, open: string | null): DiagnosticAnswer[] {
  const out: DiagnosticAnswer[] = diagnosticChoiceSpecs().map((q) => ({ questionId: q.id, value: choice(q.moduleId) }));
  if (open !== null) out.push({ questionId: OPEN_QUESTION_ID, value: open });
  return out;
}

describe("getDiagnosticQuestions", () => {
  it("serves 7 questions: six choices across the six modules and the open question last", () => {
    const qs = getDiagnosticQuestions(makeProfile());
    expect(qs).toHaveLength(7);
    expect(qs[6]).toMatchObject({ id: OPEN_QUESTION_ID, kind: "open", skillId: "markets.volume" });
    const modules = new Set(qs.slice(0, 6).map((q) => q.skillId.split(".")[0]));
    // the wave 2 wealth module is reached through its prerequisites, not the onboarding diagnostic
    expect(modules).toEqual(new Set(curriculum.modules.map((m) => m.id).filter((id) => id !== "wealth")));
    for (const q of qs.slice(0, 6)) expect(q.options?.length).toBe(4);
  });

  it("puts the learner's goal modules first", () => {
    const qs = getDiagnosticQuestions(makeProfile({ learningGoal: "etf-and-indexes" }));
    expect(qs[0].skillId.startsWith("etf.")).toBe(true);
    expect(qs[1].skillId.startsWith("indexes.")).toBe(true);
  });

  it("every distractor maps to a real misconception id", () => {
    for (const q of diagnosticChoiceSpecs()) {
      expect(q.options.filter((o) => o.correct)).toHaveLength(1);
      for (const o of q.options) if (!o.correct) expect(getMisconception(o.misconceptionId ?? "")).toBeDefined();
    }
  });
});

describe("scoreOpenAnswerByRules", () => {
  it("scores a strong answer 4 and a one-sided answer 2", () => {
    expect(scoreOpenAnswerByRules(STRONG_OPEN).level).toBe(4);
    expect(scoreOpenAnswerByRules("High volume means a lot of trading activity happened that day.").level).toBe(2);
  });
  it("caps a confident wrong answer and flags the misconception", () => {
    const r = scoreOpenAnswerByRules("High volume means buying pressure, definitely. The price will go up.");
    expect(r.level).toBeLessThanOrEqual(2);
    expect(r.misconceptionIds).toContain("volume-implies-direction");
  });
  it("gives 0 for blank or off-topic", () => {
    expect(scoreOpenAnswerByRules("").level).toBe(0);
    expect(scoreOpenAnswerByRules("I like turtles and pizza on Fridays.").level).toBe(0);
  });
});

describe("runDiagnostic", () => {
  it("all wrong → start at markets, with misconception gaps and no mastery", async () => {
    const r = await runDiagnostic(makeProfile(), answersWith(() => "b", "volume is up"), { model: null, now: NOW });
    expect(r.recommendedStartModuleId).toBe("markets");
    expect(r.recommendedStartSkillId).toBe("markets.price");
    const markets = r.estimates.find((e) => e.skillId === "markets");
    expect(markets?.estimatedLevel).toBeLessThanOrEqual(1);
    expect(markets?.gaps.some((g) => /Volume shows buying/.test(g))).toBe(true);
    expect(r.estimates.every((e) => e.estimatedLevel <= 4 && e.confidence < 0.7)).toBe(true);
    expect(r.summary).toMatch(/0 of 6/);
  });

  it("all correct + strong open answer → starts beyond markets, never above level 4", async () => {
    const r = await runDiagnostic(makeProfile(), answersWith(() => "a", STRONG_OPEN), { model: null, now: NOW });
    expect(r.recommendedStartModuleId).not.toBe("markets");
    expect(r.estimates.find((e) => e.skillId === "markets.volume")?.estimatedLevel).toBe(4);
    expect(Math.max(...r.estimates.map((e) => e.estimatedLevel))).toBeLessThanOrEqual(4);
  });

  it("covers every module skill and every leaf skill with an estimate", async () => {
    const r = await runDiagnostic(makeProfile(), answersWith(() => "a", STRONG_OPEN), { model: null, now: NOW });
    const ids = new Set(r.estimates.map((e) => e.skillId));
    for (const m of curriculum.modules) expect(ids.has(m.id)).toBe(true);
    for (const s of curriculum.skills) expect(ids.has(s.id)).toBe(true);
  });

  it("experienced nudges forward by one module only when the start module is borderline", async () => {
    // markets MC correct (3) + weak open (1) → markets level 2 → nudge to news
    const answers = answersWith((m) => (m === "markets" ? "a" : "b"), "volume is activity");
    const some = await runDiagnostic(makeProfile({ experienceLevel: "some" }), answers, { model: null, now: NOW });
    const experienced = await runDiagnostic(makeProfile({ experienceLevel: "experienced" }), answers, { model: null, now: NOW });
    expect(some.recommendedStartModuleId).toBe("markets");
    expect(experienced.recommendedStartModuleId).toBe("news");
    expect(experienced.summary).toMatch(/one module later/);
    // and never marks skills stronger than the answers show
    expect(experienced.estimates.find((e) => e.skillId === "news")?.estimatedLevel).toBe(1);
  });

  it("'new' nudges back by at most one module when the previous module rests on a single answer", async () => {
    // markets (two questions, confidence 0.55) and news (one question, 0.45) correct → start etf → nudged back to news, not markets
    const answers = answersWith((m) => (m === "markets" || m === "news" ? "a" : "b"), STRONG_OPEN);
    const r = await runDiagnostic(makeProfile({ experienceLevel: "new" }), answers, { model: null, now: NOW });
    expect(r.recommendedStartModuleId).toBe("news");
    expect(r.summary).toMatch(/one module earlier/);
    // with only markets correct (two questions, confident) no nudge happens
    const solid = await runDiagnostic(makeProfile({ experienceLevel: "new" }), answersWith((m) => (m === "markets" ? "a" : "b"), STRONG_OPEN), { model: null, now: NOW });
    expect(solid.recommendedStartModuleId).toBe("news");
    expect(solid.summary).not.toMatch(/one module earlier/);
  });

  it("blends an LLM assessment but never lifts the open answer more than one level above the rules", async () => {
    const model = fakeModel([{ level: 4, understands: ["activity"], gaps: [], misconceptionIds: ["not-a-real-id", "volume-implies-direction"], rationale: "ok" }]);
    const r = await runDiagnostic(makeProfile(), answersWith(() => "a", "High volume means a lot of trading activity happened that day."), { model, now: NOW });
    const vol = r.estimates.find((e) => e.skillId === "markets.volume");
    expect(vol?.estimatedLevel).toBe(3);
    expect(vol?.gaps).toContain("Volume shows buying or selling");
    expect(vol?.gaps.some((g) => g.includes("not-a-real-id"))).toBe(false);
    expect(model.requests[0].user).toContain("<untrusted_content");
  });

  it("falls back to rules when the model output fails the schema", async () => {
    const model = fakeModel(["{\"level\": 9}", "not json"]);
    const r = await runDiagnostic(makeProfile(), answersWith(() => "a", STRONG_OPEN), { model, now: NOW });
    expect(r.estimates.find((e) => e.skillId === "markets.volume")?.estimatedLevel).toBe(4);
    expect(model.requests).toHaveLength(2);
  });
});
