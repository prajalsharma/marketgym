/**
 * Semantic scenario evaluation prompt (v1). Grounded ONLY in the attached
 * evidence pack and rubric; the learner's answer is untrusted data.
 */
import type { Scenario } from "@/lib/types/learning";
import type { PromptTemplate } from "./types";
import { UNTRUSTED_CONTENT_RULE, describeEvidencePack, wrapUntrusted } from "./shared";

export interface EvaluatePromptInput {
  scenario: Scenario;
  answer: string;
  /** misconception ids the model may use, with labels so it can recognise them */
  allowedMisconceptions: Array<{ id: string; label: string; description: string }>;
  /** findings from the deterministic pass, for context only (the model must still judge independently) */
  rulesSummary: { matchedKeyPoints: string[]; missingKeyPoints: string[]; evidenceReferences: string[] };
}

export const evaluatePrompt: PromptTemplate<EvaluatePromptInput> = {
  version: "evaluate-v1",
  system: [
    "You are a strict but fair grader for a crypto market-analysis course. You grade one written answer against a rubric.",
    "Ground every judgement ONLY in the evidence pack and rubric provided. Do not use outside knowledge of current prices, flows or news; if the answer cites a figure that is not in the pack, treat it as unsupported.",
    "Scores: factual 0-35 (are the claims correct given the evidence and the key points?), evidence 0-25 (does the answer actually reference the attached data: names, figures, sources, dates?), reasoning 0-25 (does it move from observation to interpretation with explicit connectors, and avoid unsupported certainty?), uncertainty 0-15 (does it say what the evidence cannot show, what would change the view, what else it would need?).",
    "A confident answer with no reference to the evidence must score low on evidence AND uncertainty, no matter how fluent it is. An answer that contradicts the pack loses factual points. Reasonable alternative readings listed in the rubric are not penalised.",
    "misconceptionIds must only contain ids from the allowed list, and only when the answer clearly exhibits that misconception (not when it correctly rejects it).",
    "explanation: 2-5 plain sentences addressed to the learner, naming what was right and what was missing. followUp: one focused question that pushes the learner to the most important missing element. Never give buy/sell advice. Never invent figures.",
    "confidence: how sure you are of your scoring (0-1); lower it when the answer is short, ambiguous or off-topic.",
    UNTRUSTED_CONTENT_RULE,
    "Reply with JSON only.",
  ].join("\n"),
  build(input: EvaluatePromptInput): string {
    const { scenario, answer, allowedMisconceptions, rulesSummary } = input;
    const dims = scenario.rubric.dimensions
      .map((d) => `- ${d.key} (max ${d.maxPoints}): ${d.criteria.join("; ")}`)
      .join("\n");
    const misconceptions = allowedMisconceptions.map((m) => `- ${m.id}: ${m.label} — ${m.description}`).join("\n");
    return [
      `Scenario: ${scenario.title}`,
      `Learning objective: ${scenario.learningObjective}`,
      `Questions the learner answered in one response:\n${scenario.questions.map((q, i) => `${i + 1}. ${q.prompt}`).join("\n")}`,
      `Expected reasoning: ${scenario.expectedReasoning.join("; ") || "n/a"}`,
      `Rubric dimensions:\n${dims}`,
      `Key points a strong answer covers: ${scenario.rubric.keyPoints.join(" | ") || "n/a"}`,
      `Acceptable alternative readings: ${scenario.rubric.acceptableAlternatives.join(" | ") || "none listed"}`,
      `Allowed misconception ids:\n${misconceptions || "(none)"}`,
      "",
      describeEvidencePack(scenario.evidence),
      "",
      `Deterministic pre-check (context only): matched key points ${JSON.stringify(rulesSummary.matchedKeyPoints)}; missing ${JSON.stringify(rulesSummary.missingKeyPoints)}; evidence references found ${JSON.stringify(rulesSummary.evidenceReferences)}.`,
      "",
      "Learner answer:",
      wrapUntrusted("learner_answer", answer),
    ].join("\n");
  },
};
