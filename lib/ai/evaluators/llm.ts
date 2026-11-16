/**
 * Semantic evaluator. Asks the model for the same four rubric dimensions plus
 * extracted reasoning/missing evidence/misconceptions, grounded only in the
 * scenario's frozen evidence pack and rubric. Returns null when no model is
 * available or the output fails validation; evaluate.ts then uses rules only.
 */
import { curriculum, getMisconception } from "@/lib/curriculum";
import type { Scenario } from "@/lib/types/learning";
import type { LearningMemory } from "@/lib/learning/memory";
import type { LanguageModel } from "../provider";
import { callStructured } from "../structured";
import { evaluatePrompt } from "../prompts/evaluate";
import { SemanticEvaluationSchema, type SemanticEvaluation } from "../schemas/evaluation";
import type { RulesEvaluation } from "./rules";
import { uniq } from "./text";

export interface LlmEvaluationResult {
  evaluation: SemanticEvaluation;
  promptVersion: string;
  modelName: string;
}

export interface LlmEvaluateInput {
  scenario: Scenario;
  answer: string;
  memory: LearningMemory;
  rules: RulesEvaluation;
  /** undefined → getModel(); null → skip */
  model?: LanguageModel | null;
  timeoutMs?: number;
}

/** misconception ids the model is allowed to return for this scenario */
export function allowedMisconceptionsFor(scenario: Scenario): Array<{ id: string; label: string; description: string }> {
  const ids = uniq([
    ...scenario.rubric.commonMisconceptionIds,
    ...curriculum.misconceptions.filter((m) => scenario.skillIds.includes(m.skillId)).map((m) => m.id),
  ]);
  const out: Array<{ id: string; label: string; description: string }> = [];
  for (const id of ids) {
    const m = getMisconception(id);
    if (m) out.push({ id: m.id, label: m.label, description: m.description });
  }
  return out;
}

export async function evaluateWithLlm(input: LlmEvaluateInput): Promise<LlmEvaluationResult | null> {
  const allowed = allowedMisconceptionsFor(input.scenario);
  const result = await callStructured(
    SemanticEvaluationSchema,
    evaluatePrompt,
    {
      scenario: input.scenario,
      answer: input.answer,
      allowedMisconceptions: allowed,
      rulesSummary: {
        matchedKeyPoints: input.rules.matchedKeyPoints,
        missingKeyPoints: input.rules.missingKeyPoints,
        evidenceReferences: input.rules.evidenceReferences,
      },
    },
    { schemaName: "scenario_evaluation", model: input.model, timeoutMs: input.timeoutMs },
  );
  if (!result.ok) return null;
  const allowedIds = new Set(allowed.map((a) => a.id));
  const evaluation: SemanticEvaluation = {
    ...result.value,
    misconceptionIds: uniq(result.value.misconceptionIds.filter((id) => allowedIds.has(id))),
  };
  return { evaluation, promptVersion: result.promptVersion, modelName: result.modelName };
}
