/**
 * Socratic coach turn prompt (v1). The coach teaches one skill from the
 * module's own concept sections and the supplied evidence pack, one question
 * at a time, and never gives trading advice.
 */
import type { ConceptSection, KnowledgeCheck } from "@/lib/types/curriculum";
import type { CoachMessage } from "@/lib/types/learning";
import type { EvidencePack } from "@/lib/types/market";
import type { PromptTemplate } from "./types";
import { UNTRUSTED_CONTENT_RULE, describeEvidencePack, wrapUntrusted } from "./shared";

export interface CoachPromptInput {
  moduleId: string;
  skillId: string;
  skillName: string;
  objective: string;
  concepts: ConceptSection[];
  knowledgeChecks: KnowledgeCheck[];
  allowedMisconceptions: Array<{ id: string; label: string; cues: string[] }>;
  preferredStyle: "concise" | "detailed" | "examples";
  recurringMisconceptionIds: string[];
  evidence: EvidencePack;
  /** prior turns, oldest first (learner turns are untrusted) */
  history: CoachMessage[];
  learnerMessage: string;
  hintsRevealed: number;
}

export const coachPrompt: PromptTemplate<CoachPromptInput> = {
  version: "coach-v2",
  system: [
    "You are a Socratic coach for a crypto market-analysis course. You help one learner understand one skill.",
    "Rules:",
    "1. Ask exactly ONE focused question per turn, at the end of your message. Never ask two.",
    "2. Graduated reveal: first nudge, then narrow, then explain. Do not hand over the full answer while the learner has not tried.",
    "3. If the learner's message shows a misconception from the allowed list, name it plainly (its label), correct it in one or two sentences, and set misconceptionId to that id. Otherwise set misconceptionId to null.",
    "4. Use only the lesson's concept sections, the knowledge checks and the evidence pack supplied below. Quote figures only if they appear in the evidence pack, and cite the evidence id. Never invent prices, flows, dates or sources.",
    "5. No buy/sell/hold advice, no predictions. If asked, say the course does not give trading advice and redirect to reading the evidence.",
    "5b. For funds and rewards: never recommend a fund, a portfolio weight or a market. NAV, ROI, APY and DCA figures are past or annualised, not promises; a reward feed of big wins is a filtered sample.",
    "6. If the evidence pack does not contain what you would need to answer, say so explicitly ('the attached data does not show...').",
    "7. When a knowledge check from the list fits the moment, set attachKnowledgeCheckId to its id and pose its prompt as your question; otherwise null.",
    "8. Set objectiveComplete to true only when the learner has, in their own words, correctly demonstrated the objective. Then your message may end without a question.",
    "9. Match the learner's preferred style: concise = 2-3 short sentences; detailed = up to 6 sentences; examples = always include one concrete example from the lesson or evidence.",
    "10. citations: list the module id and every evidence id you relied on.",
    UNTRUSTED_CONTENT_RULE,
    "Reply with JSON only.",
  ].join("\n"),
  build(input: CoachPromptInput): string {
    const concepts = input.concepts
      .map((c) => `### ${c.heading}\n${c.body}${c.example ? `\nExample: ${c.example}` : ""}`)
      .join("\n\n");
    const checks = input.knowledgeChecks
      .map(
        (k) =>
          `- ${k.id}: ${k.prompt}\n` +
          k.options.map((o) => `    (${o.id}) ${o.text} [${o.correct ? "correct" : "wrong"}]: ${o.explanation}`).join("\n"),
      )
      .join("\n");
    const misconceptions = input.allowedMisconceptions.map((m) => `- ${m.id}: ${m.label}`).join("\n");
    const history = input.history
      .slice(-8)
      .map((m) =>
        m.role === "coach" ? `Coach: ${m.content}` : `Learner: ${wrapUntrusted("learner_turn", m.content, 1500)}`,
      )
      .join("\n");
    return [
      `Module: ${input.moduleId}. Skill: ${input.skillId} (${input.skillName}).`,
      `Objective: ${input.objective}`,
      `Learner preferred style: ${input.preferredStyle}. Hints already revealed: ${input.hintsRevealed}/3.`,
      `Recurring misconceptions for this learner: ${input.recurringMisconceptionIds.join(", ") || "none"}`,
      "",
      `Lesson concept sections:\n${concepts || "(none)"}`,
      "",
      `Knowledge checks available:\n${checks || "(none)"}`,
      "",
      `Allowed misconception ids:\n${misconceptions || "(none)"}`,
      "",
      describeEvidencePack(input.evidence),
      "",
      `Conversation so far:\n${history || "(no prior turns)"}`,
      "",
      "Latest learner message:",
      wrapUntrusted("learner_message", input.learnerMessage),
    ].join("\n");
  },
};
