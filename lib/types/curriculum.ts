/**
 * Curriculum contracts. The seed curriculum (supabase/seed + lib/curriculum)
 * conforms to these. FROZEN — change only via docs/CONTRACTS.md.
 */

export type SkillCategory =
  | "markets"
  | "news"
  | "etf"
  | "indexes"
  | "orderbook"
  | "reasoning";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Skill {
  id: string; // stable slug, e.g. "markets.liquidity"
  name: string;
  description: string;
  category: SkillCategory;
  difficulty: Difficulty;
  parentSkillId: string | null; // module skill id, e.g. "markets"
  /** skills that should be understood first (within or across modules) */
  prerequisiteSkillIds: string[];
}

export interface ConceptSection {
  heading: string;
  body: string; // markdown-lite: paragraphs separated by blank lines, **bold**, bullet lines starting with "- "
  example?: string;
}

export interface KnowledgeCheckOption {
  id: string;
  text: string;
  correct: boolean;
  /** shown after answering, explains why this option is right or wrong */
  explanation: string;
  /** misconception id triggered if the learner picks this wrong option */
  misconceptionId?: string;
}

export interface KnowledgeCheck {
  id: string;
  skillId: string;
  prompt: string;
  options: KnowledgeCheckOption[];
}

export interface RubricDimension {
  key: "factual" | "evidence" | "reasoning" | "uncertainty";
  label: string;
  maxPoints: 35 | 25 | 15;
  /** what a full-marks answer must do */
  criteria: string[];
}

export interface Rubric {
  dimensions: RubricDimension[]; // always factual 35, evidence 25, reasoning 25, uncertainty 15
  /** phrases/facts a strong answer should mention (used by deterministic scoring + LLM grounding) */
  keyPoints: string[];
  /** reasonable alternative readings that should not be penalised */
  acceptableAlternatives: string[];
  /** misconception ids commonly triggered by this exercise */
  commonMisconceptionIds: string[];
}

export interface Misconception {
  id: string; // e.g. "volume-implies-direction"
  skillId: string;
  label: string;
  description: string;
  /** cue phrases that suggest the misconception in free text (lowercase) */
  cues: string[];
  correction: string;
  /** critical misconceptions block mastery until resolved */
  critical: boolean;
}

export type ExerciseKind = "scenario" | "orderbook";

export interface ExerciseTemplate {
  id: string;
  skillIds: string[];
  kind: ExerciseKind;
  title: string;
  difficulty: Difficulty;
  learningObjective: string;
  /** which evidence the backend must attach: e.g. ["snapshot:BTC","etf:BTC","news:etf","orderbook:vBTC_vUSDC"] */
  evidenceRequirements: string[];
  /** questions the learner answers in one written response; order matters */
  questions: string[];
  /** reasoning dimensions the evaluator looks for */
  expectedReasoning: string[];
  rubric: Rubric;
  /** graduated hints, mildest first */
  hints: [string, string, string];
}

export interface Module {
  id: string; // e.g. "markets"
  sequence: number;
  title: string;
  summary: string;
  learningObjectives: string[];
  prerequisiteModuleIds: string[];
  skillIds: string[];
  concepts: ConceptSection[];
  knowledgeChecks: KnowledgeCheck[];
  exercises: ExerciseTemplate[];
  rubricNotes: string;
  recommendedNext: string;
}

export interface LearningPath {
  id: string; // "crypto-market-analyst-foundations"
  title: string;
  description: string;
  difficulty: Difficulty;
  published: boolean;
  moduleIds: string[];
}

export interface Curriculum {
  path: LearningPath;
  modules: Module[];
  skills: Skill[];
  misconceptions: Misconception[];
}
