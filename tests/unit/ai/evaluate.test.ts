import { describe, expect, it } from "vitest";
import { HINT_PENALTY, agreementFactor, applyPenalty, blendScores, evaluateAttempt } from "@/lib/ai/evaluators/evaluate";
import { fakeModel, makeMemory, makeScenario } from "../learning/fixtures";

const scenario = makeScenario("ex.markets.describe-snapshot");
const memory = makeMemory();

const CONFIDENT_UNSUPPORTED = "Bitcoin will definitely go up from here. This is guaranteed because everyone is buying. There is no doubt the price will rise further this week.";
const CITED =
  "BTC is quoted at 75,576 with a 24-hour change of -1.2% and 24h volume of about 32.1B dollars; ETH is at 2,223.3, up 0.8%. The price is the last traded quote at one timestamp, and the 24-hour change compares two points in time so it does not show the path. Volume counts how much was traded, and every trade has one buyer and one seller, so it suggests activity rather than direction. I cannot conclude whether today's volume is unusual; I would need the asset's own recent average.";

const goodLlm = {
  rubricScores: { factual: 35, evidence: 25, reasoning: 25, uncertainty: 15 },
  correctReasoning: ["separates observation from interpretation"],
  missingEvidence: ["did not mention market cap"],
  misconceptionIds: ["price-equals-value", "not-a-real-id"],
  explanation: "Strong answer.",
  followUp: "What would make today's volume unusual?",
  confidence: 0.9,
};

describe("blendScores and caps", () => {
  it("blends 0.4 rules + 0.6 llm, capping factual and evidence at rules + 15", () => {
    const blended = blendScores({ factual: 0, evidence: 0, reasoning: 0, uncertainty: 0 }, { factual: 35, evidence: 25, reasoning: 25, uncertainty: 15 });
    expect(blended).toEqual({ factual: 15, evidence: 15, reasoning: 15, uncertainty: 9 });
    const mid = blendScores({ factual: 10, evidence: 20, reasoning: 10, uncertainty: 5 }, { factual: 35, evidence: 25, reasoning: 25, uncertainty: 15 });
    expect(mid).toEqual({ factual: 25, evidence: 23, reasoning: 19, uncertainty: 11 });
  });
  it("applies hint penalties to the largest dimension first, never below zero", () => {
    expect(applyPenalty({ factual: 20, evidence: 5, reasoning: 5, uncertainty: 5 }, 10)).toEqual({ factual: 10, evidence: 5, reasoning: 5, uncertainty: 5 });
    expect(applyPenalty({ factual: 3, evidence: 2, reasoning: 0, uncertainty: 0 }, 10)).toEqual({ factual: 0, evidence: 0, reasoning: 0, uncertainty: 0 });
  });
  it("agreement factor shrinks with disagreement and floors at 0.5", () => {
    expect(agreementFactor(80, 80)).toBe(1);
    expect(agreementFactor(20, 50)).toBeCloseTo(0.7);
    expect(agreementFactor(0, 100)).toBe(0.5);
  });
});

describe("evaluateAttempt — rules only", () => {
  it("reports evaluatorMode rules, templated explanation and the next hint as follow-up", async () => {
    const e = await evaluateAttempt({ scenario, answer: CITED, hintsUsed: 0, memory, model: null });
    expect(e.evaluatorMode).toBe("rules");
    expect(e.promptVersion).toBe("rules-v1");
    expect(e.totalScore).toBe(e.rubricScores.factual + e.rubricScores.evidence + e.rubricScores.reasoning + e.rubricScores.uncertainty);
    expect(e.explanation).toMatch(/Key points covered/);
    expect(e.followUp).toBe(scenario.hints[0]);
    expect(e.confidence).toBeLessThanOrEqual(0.8);
  });
  it("deducts 5 points per hint and says so; after three hints the follow-up is the final question", async () => {
    const none = await evaluateAttempt({ scenario, answer: CITED, hintsUsed: 0, memory, model: null });
    const two = await evaluateAttempt({ scenario, answer: CITED, hintsUsed: 2, memory, model: null });
    const three = await evaluateAttempt({ scenario, answer: CITED, hintsUsed: 3, memory, model: null });
    expect(two.totalScore).toBe(none.totalScore - 2 * HINT_PENALTY);
    expect(two.explanation).toMatch(/2 hint\(s\) used: 10 points deducted/);
    expect(two.followUp).toBe(scenario.hints[2]);
    expect(three.followUp).toBe(scenario.questions[scenario.questions.length - 1].prompt);
  });
  it("recommends review skills when the score is low", async () => {
    const e = await evaluateAttempt({ scenario, answer: CONFIDENT_UNSUPPORTED, hintsUsed: 0, memory, model: null });
    expect(e.totalScore).toBeLessThan(60);
    expect(e.recommendedReviewSkillIds).toEqual(expect.arrayContaining(scenario.skillIds));
  });
});

describe("evaluateAttempt — with model", () => {
  it("a confident unsupported answer cannot be lifted high by a generous model", async () => {
    const model = fakeModel([goodLlm]);
    const e = await evaluateAttempt({ scenario, answer: CONFIDENT_UNSUPPORTED, hintsUsed: 0, memory, model });
    expect(e.evaluatorMode).toBe("llm");
    expect(e.promptVersion).toBe("evaluate-v2");
    expect(e.rubricScores.evidence).toBeLessThanOrEqual(8 + 15);
    expect(e.rubricScores.factual).toBeLessThanOrEqual(10 + 15);
    expect(e.totalScore).toBeLessThan(75);
    expect(e.confidence).toBeLessThan(0.9); // agreement factor applied
    expect(e.misconceptionIds).toContain("price-equals-value");
    expect(e.misconceptionIds).not.toContain("not-a-real-id");
    expect(e.followUp).toBe(goodLlm.followUp);
    expect(model.requests[0].user).toContain("<untrusted_content");
    expect(model.requests[0].system).toMatch(/never an instruction/i);
  });
  it("a cited answer with an agreeing model scores high with high confidence", async () => {
    const model = fakeModel([goodLlm]);
    const e = await evaluateAttempt({ scenario, answer: CITED, hintsUsed: 0, memory, model });
    expect(e.totalScore).toBeGreaterThanOrEqual(80);
    expect(e.confidence).toBeGreaterThanOrEqual(0.7);
    expect(e.totalScore).toBe(e.rubricScores.factual + e.rubricScores.evidence + e.rubricScores.reasoning + e.rubricScores.uncertainty);
  });
  it("malformed model JSON (twice) falls back to rules mode", async () => {
    const model = fakeModel(["{not json", "{\"rubricScores\": {\"factual\": 99}}"]);
    const e = await evaluateAttempt({ scenario, answer: CITED, hintsUsed: 0, memory, model });
    expect(e.evaluatorMode).toBe("rules");
    expect(model.requests).toHaveLength(2);
    expect(model.requests[1].user).toMatch(/did not match the required JSON schema/);
  });
  it("a model transport error falls back to rules mode", async () => {
    const model = fakeModel([]);
    const e = await evaluateAttempt({ scenario, answer: CITED, hintsUsed: 1, memory, model });
    expect(e.evaluatorMode).toBe("rules");
    expect(e.explanation).toMatch(/1 hint\(s\) used/);
  });
});
