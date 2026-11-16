import type { Rubric, RubricDimension } from "@/lib/types/curriculum";

export interface RubricInput {
  /** what a full-marks answer must get right (35 points) */
  factual: string[];
  /** how it must use the attached evidence (25 points) */
  evidence: string[];
  /** how it must reason from evidence to claim (25 points) */
  reasoning: string[];
  /** how it must handle what it cannot know (15 points) */
  uncertainty: string[];
  keyPoints: string[];
  acceptableAlternatives: string[];
  commonMisconceptionIds: string[];
}

/**
 * Builds a rubric with the fixed point split (35 / 25 / 25 / 15 = 100) so every
 * exercise template shares the same shape and the validator can check the sum.
 */
export function makeRubric(input: RubricInput): Rubric {
  const dimensions: RubricDimension[] = [
    {
      key: "factual",
      label: "Factual accuracy",
      maxPoints: 35,
      criteria: input.factual,
    },
    {
      key: "evidence",
      label: "Use of evidence",
      maxPoints: 25,
      criteria: input.evidence,
    },
    {
      key: "reasoning",
      label: "Quality of reasoning",
      maxPoints: 25,
      criteria: input.reasoning,
    },
    {
      key: "uncertainty",
      label: "Handling uncertainty",
      maxPoints: 15,
      criteria: input.uncertainty,
    },
  ];
  return {
    dimensions,
    keyPoints: input.keyPoints,
    acceptableAlternatives: input.acceptableAlternatives,
    commonMisconceptionIds: input.commonMisconceptionIds,
  };
}
