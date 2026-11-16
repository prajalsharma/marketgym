/**
 * LLM assessment of the single open diagnostic question. Blended with the
 * deterministic rule score; never used alone and never trusted for mastery.
 */
import { z } from "zod";

export const DiagnosticOpenAssessmentSchema = z.object({
  /** 0 = no understanding .. 4 = strong, nuanced */
  level: z.number().int().min(0).max(4),
  /** what the answer shows the learner understands (short quotes or paraphrases) */
  understands: z.array(z.string().max(240)).max(5),
  /** what is missing or wrong */
  gaps: z.array(z.string().max(240)).max(5),
  /** only ids from the allowed list */
  misconceptionIds: z.array(z.string().max(80)).max(4),
  rationale: z.string().min(1).max(600),
});

export type DiagnosticOpenAssessment = z.infer<typeof DiagnosticOpenAssessmentSchema>;
