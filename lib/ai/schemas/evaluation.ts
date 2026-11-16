/**
 * Semantic evaluation produced by the LLM evaluator. Strict-schema friendly:
 * no optional fields (nullable where needed), bounded numbers, bounded arrays.
 */
import { z } from "zod";

export const RubricScoresSchema = z.object({
  factual: z.number().min(0).max(35),
  evidence: z.number().min(0).max(25),
  reasoning: z.number().min(0).max(25),
  uncertainty: z.number().min(0).max(15),
});

export const SemanticEvaluationSchema = z.object({
  rubricScores: RubricScoresSchema,
  /** reasoning steps the learner got right, in their words where possible */
  correctReasoning: z.array(z.string().max(300)).max(8),
  /** evidence in the pack the learner should have used but did not */
  missingEvidence: z.array(z.string().max(300)).max(8),
  /** only ids from the allowed list; anything else is dropped by the evaluator */
  misconceptionIds: z.array(z.string().max(80)).max(6),
  explanation: z.string().min(1).max(1500),
  followUp: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export type SemanticEvaluation = z.infer<typeof SemanticEvaluationSchema>;
