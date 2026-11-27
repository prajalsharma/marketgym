/**
 * API envelope + request/response contracts for app/api. FROZEN.
 * Every route returns ApiOk<T> | ApiErr with the matching HTTP status.
 */
import type { z } from "zod";
import type {
  ActivityEvent,
  CoachSession,
  DiagnosticAnswer,
  DiagnosticResult,
  Evaluation,
  MasteryRecord,
  NextMission,
  Profile,
  Review,
  Scenario,
  ScenarioAttempt,
} from "./learning";
import type { Curriculum, KnowledgeCheck, Module, Skill } from "./curriculum";
import type {
  DcaSimulation,
  PaperPortfolio,
  PortfolioAnalysis,
  PortfolioHolding,
  RewardFeed,
  RewardsIncentives,
  WealthFund,
  WealthPriceSeries,
  WealthQuote,
} from "./wealth";
import type {
  EtfFlowSeries,
  IndexSnapshot,
  MarketSnapshot,
  NewsEvidence,
  OrderBookSnapshot,
} from "./market";

export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "rate_limited"
  | "upstream_unavailable"
  | "internal_error";

export interface ApiOk<T> {
  ok: true;
  data: T;
}
export interface ApiErr {
  ok: false;
  error: { code: ApiErrorCode; message: string; details?: unknown };
}
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export const API_STATUS: Record<ApiErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_error: 400,
  rate_limited: 429,
  upstream_unavailable: 503,
  internal_error: 500,
};

// ---- profile / onboarding ----
export interface ProfileUpsertRequest {
  displayName: string;
  experienceLevel: Profile["experienceLevel"];
  learningGoal: Profile["learningGoal"];
  preferredLearningStyle: Profile["preferredLearningStyle"];
  interests: string[];
}
export type ProfileResponse = Profile;

export interface DiagnosticSubmitRequest {
  answers: DiagnosticAnswer[];
}
export type DiagnosticSubmitResponse = DiagnosticResult & { nextMission: NextMission };

// ---- learning ----
export interface SkillProgress {
  skill: Skill;
  mastery: MasteryRecord | null;
  /** all prerequisites mastered or practising, so content is unlocked */
  unlocked: boolean;
}
export interface LearningPathResponse {
  curriculum: Curriculum;
  skills: SkillProgress[];
  modules: Array<{
    module: Module;
    unlocked: boolean;
    progress: number; // 0..1 share of skills at practising+ level
  }>;
  nextMission: NextMission;
}
export type LearningNextResponse = NextMission;
export type LearningSkillsResponse = SkillProgress[];

export interface KnowledgeCheckSubmitRequest {
  knowledgeCheckId: string;
  optionId: string;
}
export interface KnowledgeCheckSubmitResponse {
  correct: boolean;
  explanation: string;
  misconceptionId?: string;
  check: KnowledgeCheck;
}

export interface ReviewSubmitRequest {
  reviewId: string;
  knowledgeCheckId: string;
  optionId: string;
}
export interface ReviewSubmitResponse {
  review: Review;
  correct: boolean;
  explanation: string;
  mastery: MasteryRecord;
}

// ---- coach ----
export interface CoachSessionCreateRequest {
  skillId: string;
}
export type CoachSessionResponse = CoachSession;
export interface CoachRespondRequest {
  sessionId: string;
  message: string;
}
export type CoachRespondResponse = CoachSession;
export interface CoachHintRequest {
  sessionId: string;
}
export type CoachHintResponse = CoachSession;

// ---- scenarios ----
export type ScenarioNextResponse = Scenario;
export type ScenarioGetResponse = Scenario & { latestAttempt: ScenarioAttempt | null };
export interface ScenarioAttemptRequest {
  answer: string;
  hintsUsed: number;
}
export interface ScenarioAttemptResponse {
  attempt: ScenarioAttempt;
  evaluation: Evaluation;
  masteryUpdates: MasteryRecord[];
  nextMission: NextMission;
}
export type ScenarioResultResponse = ScenarioAttempt[];

// ---- orderbook gym ----
export interface OrderBookExerciseSubmitRequest {
  exerciseId: string;
  market: string;
  /** learner's numeric/choice answers keyed by question id */
  answers: Record<string, string | number>;
  /** the snapshot the learner saw (sent back so grading matches what was displayed) */
  snapshotTimestamp: string;
}
export interface OrderBookExerciseSubmitResponse {
  score: number; // 0..100
  results: Array<{ questionId: string; correct: boolean; expected: string; explanation: string }>;
  masteryUpdates: MasteryRecord[];
}

// ---- market ----
export type MarketSnapshotResponse = MarketSnapshot[];
export type MarketNewsResponse = NewsEvidence[];
export type MarketEtfResponse = EtfFlowSeries[];
export type MarketIndexesResponse = IndexSnapshot[];
export type MarketOrderBookResponse = OrderBookSnapshot;

// ---- progress ----
export interface ProgressOverviewResponse {
  profile: Profile;
  nextMission: NextMission;
  skills: SkillProgress[];
  weakestSkills: Array<{ skillId: string; masteryScore: number; reason: string }>;
  recurringMisconceptions: Array<{ misconceptionId: string; label: string; count: number; lastSeenAt: string }>;
  upcomingReviews: Review[];
  recentActivity: ActivityEvent[];
  streakDays: number;
  weekly: { attempts: number; averageScore: number | null; skillsImproved: number; minutesEstimate: number };
  masteredCount: number;
  totalSkills: number;
}
export type ProgressSkillsResponse = SkillProgress[];
export type ProgressReviewsResponse = Review[];
export type ProgressAttemptsResponse = ScenarioAttempt[];

export type Infer<T extends z.ZodTypeAny> = z.infer<T>;

// ---- SoDEX Wealth / Rewards (public, read-only) ----
export interface WealthBoardResponse {
  funds: WealthFund[];
  quotes: WealthQuote[];
}
export type WealthFundResponse = WealthFund & { quote: WealthQuote | null };
export type WealthPriceHistoryResponse = WealthPriceSeries;
export type WealthDcaResponse = DcaSimulation;
export interface RewardsResponse {
  incentives: RewardsIncentives;
  feed: RewardFeed;
}

// ---- Practice (paper) portfolio ----
export interface PortfolioUpsertRequest {
  name: string;
  holdings: PortfolioHolding[];
  strategy: PaperPortfolio["strategy"];
  rationale: string;
}
export interface PortfolioResponse {
  portfolio: PaperPortfolio;
  analysis: PortfolioAnalysis;
}
export interface PortfolioReviewResponse {
  portfolio: PaperPortfolio;
  analysis: PortfolioAnalysis;
  /** the rationale graded by the standard evaluator against the portfolio exercise rubric */
  attempt: ScenarioAttempt;
  evaluation: Evaluation;
  masteryUpdates: MasteryRecord[];
  nextMission: NextMission;
}
