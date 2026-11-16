/**
 * Diagnostic open-question assessment prompt (v1). Scores one free-text
 * answer about trading volume on a 0-4 scale. The learner's text is untrusted.
 */
import type { PromptTemplate } from "./types";
import { UNTRUSTED_CONTENT_RULE, wrapUntrusted } from "./shared";

export interface DiagnosticOpenPromptInput {
  question: string;
  answer: string;
  /** what a strong answer contains */
  rubric: { tells: string[]; doesNotTell: string[] };
  allowedMisconceptions: Array<{ id: string; label: string }>;
}

export const diagnosticOpenPrompt: PromptTemplate<DiagnosticOpenPromptInput> = {
  version: "diagnostic-open-v1",
  system: [
    "You assess one short written answer from a learner starting a crypto market-analysis course. Your job is to estimate their current understanding, not to teach.",
    "Levels: 0 = blank/off-topic; 1 = mostly wrong or a bare assertion; 2 = partly right, one side of the question only; 3 = covers both what volume tells you and what it does not; 4 = level 3 plus a nuance (e.g. comparing to the asset's own history, one buyer per seller, volume vs liquidity).",
    "Never raise the level because the learner sounds confident. Judge only the content. misconceptionIds must only use ids from the allowed list and only when the answer clearly shows that belief.",
    UNTRUSTED_CONTENT_RULE,
    "Reply with JSON only.",
  ].join("\n"),
  build(input: DiagnosticOpenPromptInput): string {
    return [
      `Question: ${input.question}`,
      `A strong answer says volume tells you: ${input.rubric.tells.join("; ")}`,
      `A strong answer says volume does NOT tell you: ${input.rubric.doesNotTell.join("; ")}`,
      `Allowed misconception ids:\n${input.allowedMisconceptions.map((m) => `- ${m.id}: ${m.label}`).join("\n")}`,
      "",
      "Learner answer:",
      wrapUntrusted("learner_answer", input.answer, 2000),
    ].join("\n");
  },
};
