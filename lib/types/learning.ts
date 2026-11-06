/**
 * Learner-state contracts: profile, diagnostic, attempts, mastery, reviews,
 * coach sessions, scenarios. FROZEN — change only via docs/CONTRACTS.md.
 */
import type { Difficulty, Rubric } from "./curriculum";
import type { EvidencePack } from "./market";

export type ExperienceLevel = "new" | "some" | "experienced";
export type LearningGoal =
  | "understand-news"
  | "read-market-data"
  | "analyst-career"
  | "etf-and-indexes"
  | "market-structure";
export type LearningStyle = "concise" | "detailed" | "examples";

export interface Profile {
  id: string; // = auth user id
  displayName: string;
  experienceLevel: ExperienceLevel;
  learningGoal: LearningGoal;
  preferredLearningStyle: LearningStyle;
  interests: string[]; // skill category ids
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Diagnostic ----------

export interface DiagnosticAnswer {
  questionId: string;
  /** option id for multiple choice, or free text for open questions */
  value: string;
}

export interface DiagnosticSkillEstimate {
  skillId: string;
  estimatedLevel: 0 | 1 | 2 | 3 | 4; // 0 unknown .. 4 strong
  evidence: string[]; // quotes/observations from the answers
  gaps: string[];
  confidence: number; // 0..1
}

export interface DiagnosticResult {
  id: string;
  userId: string;
  estimates: DiagnosticSkillEstimate[];
  recommendedStartSkillId: string;
  recommendedStartModuleId: string;
  summary: string;
  createdAt: string;
}

// ---------- Scenarios & attempts ----------

export interface ScenarioQuestion {
  id: string;
  prompt: string;
}

export interface Scenario {
  id: string;
  templateId: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  skillIds: string[];
  learningObjective: string;
  /** frozen evidence; never refreshed while learners are answering */
  evidence: EvidencePack;
  questions: ScenarioQuestion[];
  expectedReasoning: string[];
  rubric: Rubric;
  hints: [string, string, string];
  createdAt: string;
}

export interface RubricScores {
  factual: number; // 0..35
  evidence: number; // 0..25
  reasoning: number; // 0..25
  uncertainty: number; // 0..15
}

export interface Evaluation {
  totalScore: number; // 0..100 = sum of rubric scores
  rubricScores: RubricScores;
  correctReasoning: string[];
  missingEvidence: string[];
  misconceptionIds: string[];
  explanation: string;
  followUp: string; // graduated hint or follow-up question
  recommendedReviewSkillIds: string[];
  confidence: number; // 0..1
  /** "llm" when an LLM contributed semantic scoring, "rules" when fully deterministic */
  evaluatorMode: "llm" | "rules";
  promptVersion: string;
}

export interface ScenarioAttempt {
  id: string;
  userId: string;
  scenarioId: string;
  skillIds: string[];
  submittedAnswer: string;
  hintsUsed: number;
  evaluation: Evaluation;
  createdAt: string;
}

// ---------- Mastery ----------

export type MasteryStatus = "not-started" | "learning" | "practising" | "mastered";

export interface MasteryEvidence {
  attemptId: string;
  score: number;
  at: string;
  kind: "scenario" | "knowledge-check" | "retention-check" | "orderbook";
}

export interface MasteryRecord {
  userId: string;
  skillId: string;
  masteryScore: number; // 0..100 derived by lib/learning/mastery.ts
  masteryStatus: MasteryStatus;
  evidenceCount: number;
  evidence: MasteryEvidence[];
  unresolvedMisconceptionIds: string[];
  lastAssessedAt: string | null;
  nextReviewAt: string | null;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  skillId: string;
  scheduledAt: string;
  completedAt: string | null;
  result: "passed" | "failed" | null;
  /** attempt that completed it */
  attemptId: string | null;
}

// ---------- Coach ----------

export type CoachRole = "coach" | "learner";

export interface CoachMessage {
  id: string;
  role: CoachRole;
  content: string;
  createdAt: string;
  /** source ids (news ids, snapshot assets, module ids) the coach relied on */
  citations?: string[];
  /** when the coach attaches a knowledge check */
  knowledgeCheckId?: string;
}

export interface CoachSession {
  id: string;
  userId: string;
  skillId: string;
  moduleId: string;
  objective: string;
  messages: CoachMessage[];
  hintsRevealed: number; // 0..3
  /** "llm" or "offline" (scripted Socratic flow from curriculum; no model key) */
  mode: "llm" | "offline";
  status: "active" | "completed";
  createdAt: string;
  updatedAt: string;
}

// ---------- Activity & progress ----------

export type ActivityKind =
  | "diagnostic"
  | "lesson"
  | "knowledge-check"
  | "scenario"
  | "orderbook"
  | "review"
  | "coach";

export interface ActivityEvent {
  id: string;
  userId: string;
  kind: ActivityKind;
  skillIds: string[];
  summary: string;
  score?: number;
  refId?: string;
  createdAt: string;
}

export interface NextMission {
  kind: "diagnostic" | "lesson" | "scenario" | "orderbook" | "review";
  skillId: string;
  moduleId: string;
  title: string;
  reason: string; // why the engine picked it, shown to learner
  href: string;
}

// ---------- Diagnostic questions (served by lib/learning/diagnostic.ts) ----------

export interface DiagnosticQuestion {
  id: string;
  skillId: string;
  kind: "choice" | "open";
  prompt: string;
  /** choice questions only */
  options?: Array<{ id: string; text: string }>;
}

// ---------- Order Book Gym exercises (lib/learning/orderbook-exercises.ts) ----------

export type OrderBookExerciseKind =
  | "identify-spread"
  | "interpret-depth"
  | "compare-liquidity"
  | "recognise-imbalance"
  | "price-time-priority";

export interface OrderBookExerciseQuestion {
  id: string;
  prompt: string;
  /** "number" = numeric input graded with tolerance; "choice" = pick an option */
  kind: "number" | "choice";
  options?: Array<{ id: string; text: string }>;
  unit?: string;
}

export interface OrderBookExercise {
  id: string;
  kind: OrderBookExerciseKind;
  skillIds: string[];
  title: string;
  instructions: string;
  /** which market(s) the exercise needs; graded against the snapshot the learner saw */
  markets: string[];
  questions: OrderBookExerciseQuestion[];
  hints: [string, string, string];
}
