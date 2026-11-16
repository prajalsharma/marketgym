/**
 * `evaluateAttempt`: combines the deterministic rules pass with the semantic
 * LLM pass when a model is available.
 *
 * Blend per dimension = 0.4 × rules + 0.6 × llm, but on `factual` and
 * `evidence` the result is capped at rules + 15 so a fluent, confident answer
 * that cites nothing cannot be lifted high by the model alone. Misconceptions
 * are the union of both passes (llm ids restricted to known ids). Confidence is
 * the model's own confidence × an agreement factor that shrinks as the two
 * totals diverge. Hints cost 5 points each off the total (never below 0).
 * Offline: rules only, `evaluatorMode: "rules"`, templated explanation.
 */
import { getMisconception } from "@/lib/curriculum";
import type { Evaluation, RubricScores, Scenario } from "@/lib/types/learning";
import type { LearningMemory } from "@/lib/learning/memory";
import type { LanguageModel } from "../provider";
import { getModel } from "../provider";
import { evaluateWithLlm } from "./llm";
import { evaluateWithRules, sumScores, type RulesEvaluation } from "./rules";
import { clamp, round, uniq } from "./text";

export const RULES_PROMPT_VERSION = "rules-v1";
export const HINT_PENALTY = 5;
export const LLM_CAP_OVER_RULES = 15;

const MAX: RubricScores = { factual: 35, evidence: 25, reasoning: 25, uncertainty: 15 };

export interface EvaluateAttemptInput {
  scenario: Scenario;
  answer: string;
  hintsUsed: number;
  memory: LearningMemory;
  /** test seam: undefined → getModel(); null → force rules-only */
  model?: LanguageModel | null;
}

export function blendScores(rules: RubricScores, llm: RubricScores): RubricScores {
  const blend = (key: keyof RubricScores, capped: boolean): number => {
    const raw = 0.4 * rules[key] + 0.6 * llm[key];
    const capValue = capped ? Math.min(raw, rules[key] + LLM_CAP_OVER_RULES) : raw;
    return round(clamp(capValue, 0, MAX[key]));
  };
  return {
    factual: blend("factual", true),
    evidence: blend("evidence", true),
    reasoning: blend("reasoning", false),
    uncertainty: blend("uncertainty", false),
  };
}

/** removes `points` from the scores, largest dimension first, keeping every dimension ≥ 0 */
export function applyPenalty(scores: RubricScores, points: number): RubricScores {
  const out = { ...scores };
  let remaining = Math.max(0, points);
  const keys: Array<keyof RubricScores> = ["factual", "evidence", "reasoning", "uncertainty"];
  while (remaining > 0) {
    const key = keys.reduce((best, k) => (out[k] > out[best] ? k : best), keys[0]);
    if (out[key] <= 0) break;
    const take = Math.min(out[key], remaining);
    out[key] -= take;
    remaining -= take;
  }
  return out;
}

export function agreementFactor(rulesTotal: number, llmTotal: number): number {
  return clamp(1 - Math.abs(rulesTotal - llmTotal) / 100, 0.5, 1);
}

function recommendedReviewSkills(scenario: Scenario, misconceptionIds: string[], total: number): string[] {
  const fromMisconceptions = misconceptionIds.map((id) => getMisconception(id)?.skillId).filter((s): s is string => Boolean(s));
  return uniq([...fromMisconceptions, ...(total < 60 ? scenario.skillIds : [])]);
}

function listOrNone(items: string[]): string {
  return items.length > 0 ? items.join("; ") : "none";
}

function rulesExplanation(rules: RulesEvaluation, hintsUsed: number): string {
  const parts: string[] = [];
  if (rules.offTopic) {
    parts.push("Your answer did not engage with the scenario's questions or evidence, so it scored 0 on every dimension.");
  } else {
    parts.push(`Key points covered: ${listOrNone(rules.matchedKeyPoints)}.`);
    if (rules.partialKeyPoints.length > 0) parts.push(`Touched on but not fully developed: ${rules.partialKeyPoints.join("; ")}.`);
    parts.push(`Key points missing: ${listOrNone(rules.missingKeyPoints)}.`);
    parts.push(
      rules.evidenceReferences.length === 0
        ? "You did not reference the attached evidence (no asset, figure, source or date from the pack appears in your answer)."
        : `Evidence referenced: ${rules.evidenceReferences.length} distinct item(s) from the pack.`,
    );
    if (rules.contradictions.length > 0) parts.push(`Contradicts the evidence: ${rules.contradictions.join("; ")}.`);
    if (rules.reasoning.unsupportedCertainty.length > 0) {
      parts.push(`Unsupported certainty: "${rules.reasoning.unsupportedCertainty.join('", "')}" without a hedge or a condition.`);
    }
    if (rules.uncertainty.hedges.length === 0 && rules.uncertainty.explicitLimits.length === 0) {
      parts.push("Nothing in the answer says what the evidence cannot show or what would change your view.");
    }
    if (rules.misconceptionIds.length > 0) {
      const labels = rules.misconceptionIds.map((id) => getMisconception(id)?.label ?? id);
      parts.push(`Watch out for: ${labels.join("; ")}.`);
    }
  }
  if (hintsUsed > 0) parts.push(`${hintsUsed} hint(s) used: ${hintsUsed * HINT_PENALTY} points deducted.`);
  parts.push("Scored by the deterministic rules evaluator (no model available).");
  return parts.join(" ");
}

function rulesFollowUp(scenario: Scenario, hintsUsed: number): string {
  const next = scenario.hints[Math.min(hintsUsed, 2)];
  if (hintsUsed < 3 && next) return next;
  return scenario.questions[scenario.questions.length - 1]?.prompt ?? scenario.learningObjective;
}

function rulesConfidence(rules: RulesEvaluation): number {
  if (rules.offTopic) return 0.7;
  let c = 0.5;
  if (rules.reasoning.wordCount >= 40) c += 0.1;
  if (rules.evidenceReferences.length >= 2) c += 0.1;
  if (rules.matchedKeyPoints.length + rules.missingKeyPoints.length >= 3) c += 0.05;
  return clamp(c, 0, 0.8);
}

export async function evaluateAttempt(input: EvaluateAttemptInput): Promise<Evaluation> {
  const { scenario, answer } = input;
  const hintsUsed = clamp(Math.floor(input.hintsUsed), 0, 3);
  const rules = evaluateWithRules({ scenario, answer });
  const model = input.model === undefined ? getModel() : input.model;
  const llm = model ? await evaluateWithLlm({ scenario, answer, memory: input.memory, rules, model }) : null;

  if (llm) {
    const blended = blendScores(rules.rubricScores, llm.evaluation.rubricScores);
    const scores = applyPenalty(blended, hintsUsed * HINT_PENALTY);
    const total = sumScores(scores);
    const misconceptionIds = uniq([...rules.misconceptionIds, ...llm.evaluation.misconceptionIds]);
    const confidence = clamp(llm.evaluation.confidence * agreementFactor(sumScores(rules.rubricScores), sumScores(llm.evaluation.rubricScores)), 0, 1);
    const explanation = [
      llm.evaluation.explanation.trim(),
      hintsUsed > 0 ? `${hintsUsed} hint(s) used: ${hintsUsed * HINT_PENALTY} points deducted.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return {
      totalScore: total,
      rubricScores: scores,
      correctReasoning: llm.evaluation.correctReasoning.length > 0 ? llm.evaluation.correctReasoning : rules.matchedKeyPoints,
      missingEvidence: llm.evaluation.missingEvidence.length > 0 ? llm.evaluation.missingEvidence : rules.missingKeyPoints,
      misconceptionIds,
      explanation,
      followUp: llm.evaluation.followUp,
      recommendedReviewSkillIds: recommendedReviewSkills(scenario, misconceptionIds, total),
      confidence: round(confidence * 100) / 100,
      evaluatorMode: "llm",
      promptVersion: llm.promptVersion,
    };
  }

  const scores = applyPenalty(rules.rubricScores, hintsUsed * HINT_PENALTY);
  const total = sumScores(scores);
  return {
    totalScore: total,
    rubricScores: scores,
    correctReasoning: rules.matchedKeyPoints,
    missingEvidence: rules.offTopic ? scenario.rubric.keyPoints : rules.missingKeyPoints,
    misconceptionIds: rules.misconceptionIds,
    explanation: rulesExplanation(rules, hintsUsed),
    followUp: rulesFollowUp(scenario, hintsUsed),
    recommendedReviewSkillIds: recommendedReviewSkills(scenario, rules.misconceptionIds, total),
    confidence: rulesConfidence(rules),
    evaluatorMode: "rules",
    promptVersion: RULES_PROMPT_VERSION,
  };
}
