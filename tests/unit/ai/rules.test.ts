import { describe, expect, it } from "vitest";
import { curriculum } from "@/lib/curriculum";
import { detectMisconceptionCues, evaluateWithRules, sumScores } from "@/lib/ai/evaluators/rules";
import { extractNumbers, matchPhraseUnnegated } from "@/lib/ai/evaluators/text";
import { makeScenario } from "../learning/fixtures";

const scenario = makeScenario("ex.markets.describe-snapshot");

const CONFIDENT_UNSUPPORTED =
  "Bitcoin will definitely go up from here. This is guaranteed because everyone is buying and the momentum is obvious. There is no doubt the price will rise further this week.";

const CITED =
  "BTC is quoted at 75,576 with a 24-hour change of -1.2% and 24h volume of about 32.1B dollars; ETH is at 2,223.3, up 0.8%. The price is the last traded quote at one timestamp, and the 24-hour change compares two points in time so it does not show the path. Volume counts how much was traded, and every trade has one buyer and one seller, so it suggests activity rather than direction. ETH changed less than BTC, but a larger percentage change is not evidence of a stronger trend. I cannot conclude whether today's volume is unusual; I would need the asset's own recent average to judge that, and the snapshot covers spot markets only.";

describe("evaluateWithRules", () => {
  it("a confident, unsupported answer scores low on evidence and uncertainty", () => {
    const r = evaluateWithRules({ scenario, answer: CONFIDENT_UNSUPPORTED });
    expect(r.rubricScores.evidence).toBeLessThanOrEqual(8);
    expect(r.rubricScores.uncertainty).toBe(0);
    expect(r.reasoning.unsupportedCertainty.length).toBeGreaterThan(0);
    expect(r.rubricScores.factual).toBeLessThanOrEqual(10);
    expect(sumScores(r.rubricScores)).toBeLessThan(30);
  });

  it("an answer that cites the pack scores clearly higher on every dimension", () => {
    const cited = evaluateWithRules({ scenario, answer: CITED });
    const confident = evaluateWithRules({ scenario, answer: CONFIDENT_UNSUPPORTED });
    expect(cited.rubricScores.evidence).toBeGreaterThanOrEqual(19);
    expect(cited.rubricScores.uncertainty).toBeGreaterThanOrEqual(10);
    expect(cited.rubricScores.factual).toBeGreaterThanOrEqual(20);
    expect(cited.rubricScores.reasoning).toBeGreaterThan(confident.rubricScores.reasoning);
    expect(sumScores(cited.rubricScores)).toBeGreaterThan(sumScores(confident.rubricScores) + 40);
    expect(cited.evidenceReferences).toEqual(expect.arrayContaining(["asset:BTC", "asset:ETH", "figure:BTC price", "figure:BTC 24h change"]));
    expect(cited.matchedKeyPoints.length).toBeGreaterThanOrEqual(4);
    expect(cited.reasoning.separatesObservationFromInterpretation).toBe(true);
  });

  it("detects misconception cues and respects negation", () => {
    const hit = evaluateWithRules({ scenario, answer: "The spike is simple: high volume means buying, so the market wants this asset at these prices." });
    expect(hit.misconceptionIds).toContain("volume-implies-direction");
    const negated = evaluateWithRules({ scenario, answer: "It is not true that high volume means buying; the volume shows activity, and every trade has a buyer and a seller." });
    expect(negated.misconceptionIds).not.toContain("volume-implies-direction");
  });

  it("scores an off-topic answer zero everywhere", () => {
    const r = evaluateWithRules({ scenario, answer: "I like turtles and pizza very much on Fridays, honestly." });
    expect(r.offTopic).toBe(true);
    expect(r.rubricScores).toEqual({ factual: 0, evidence: 0, reasoning: 0, uncertainty: 0 });
  });

  it("penalises statements that contradict the attached snapshot", () => {
    const r = evaluateWithRules({ scenario, answer: "The BTC price rose over the last 24 hours, which suggests more trades printed at higher levels; it may continue but I cannot conclude that from one day." });
    expect(r.contradictions.some((c) => /BTC price rose/.test(c))).toBe(true);
    const clean = evaluateWithRules({ scenario, answer: "The BTC price fell over the last 24 hours, which suggests more trades printed at lower levels; it may continue but I cannot conclude that from one day." });
    expect(clean.contradictions).toEqual([]);
    expect(r.rubricScores.factual).toBeLessThanOrEqual(clean.rubricScores.factual);
  });

  it("matches numbers in the pack with formatting tolerance", () => {
    expect(extractNumbers("$75,576 and 32.1B and 2,223.3 and -1.2%")).toEqual([75576, 32_100_000_000, 2223.3, -1.2]);
    const r = evaluateWithRules({ scenario, answer: "Bitcoin trades near $75.6k with roughly 32bn of volume, which suggests active markets; I would need its average to say more." });
    expect(r.evidenceReferences).toEqual(expect.arrayContaining(["asset:BTC", "figure:BTC price", "figure:BTC volume"]));
  });
});

describe("detectMisconceptionCues", () => {
  it("uses word boundaries, not substrings", () => {
    expect(matchPhraseUnnegated("the spread is the feel of the market", "spread is the fee")).toBe(false);
    expect(matchPhraseUnnegated("The spread is the fee you pay.", "spread is the fee")).toBe(true);
    const cues = detectMisconceptionCues("Honestly the spread is the fee here.", curriculum.misconceptions);
    expect(cues.map((c) => c.misconceptionId)).toContain("spread-is-fee");
  });
});
