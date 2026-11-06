/**
 * Persistence contract. FROZEN interface; implementations:
 *  - lib/db/supabase-repository.ts  (Supabase Postgres + RLS, when configured)
 *  - lib/db/local-repository.ts     (JSON file in ./.data, single demo learner)
 * Routes and services only ever talk to `Repository`. All methods are scoped
 * by userId; implementations must never return another user's rows.
 */
import type {
  ActivityEvent,
  CoachSession,
  DiagnosticResult,
  MasteryRecord,
  Profile,
  Review,
  Scenario,
  ScenarioAttempt,
} from "@/lib/types";

export interface Repository {
  // profile
  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(profile: Profile): Promise<Profile>;

  // diagnostic
  saveDiagnostic(result: DiagnosticResult): Promise<DiagnosticResult>;
  getLatestDiagnostic(userId: string): Promise<DiagnosticResult | null>;

  // scenarios (scenario rows are global/shared; attempts are per user)
  saveScenario(scenario: Scenario): Promise<Scenario>;
  getScenario(id: string): Promise<Scenario | null>;
  /** scenarios created for a template, newest first (for reuse within freshness window) */
  listScenariosByTemplate(templateId: string, limit: number): Promise<Scenario[]>;

  saveAttempt(attempt: ScenarioAttempt): Promise<ScenarioAttempt>;
  listAttempts(userId: string, opts?: { scenarioId?: string; limit?: number }): Promise<ScenarioAttempt[]>;

  // mastery
  getMastery(userId: string, skillId: string): Promise<MasteryRecord | null>;
  listMastery(userId: string): Promise<MasteryRecord[]>;
  upsertMastery(record: MasteryRecord): Promise<MasteryRecord>;

  // reviews
  saveReview(review: Review): Promise<Review>;
  getReview(userId: string, reviewId: string): Promise<Review | null>;
  listReviews(userId: string, opts?: { pending?: boolean }): Promise<Review[]>;

  // coach
  saveCoachSession(session: CoachSession): Promise<CoachSession>;
  getCoachSession(userId: string, sessionId: string): Promise<CoachSession | null>;
  listCoachSessions(userId: string, limit: number): Promise<CoachSession[]>;

  // activity
  logActivity(event: ActivityEvent): Promise<ActivityEvent>;
  listActivity(userId: string, limit: number): Promise<ActivityEvent[]>;

  // knowledge-check history (for memory + learning engine)
  saveKnowledgeCheckResult(r: KnowledgeCheckResult): Promise<KnowledgeCheckResult>;
  listKnowledgeCheckResults(userId: string, skillId?: string): Promise<KnowledgeCheckResult[]>;
}

export interface KnowledgeCheckResult {
  id: string;
  userId: string;
  skillId: string;
  knowledgeCheckId: string;
  optionId: string;
  correct: boolean;
  misconceptionId: string | null;
  /** set when this check was a scheduled retention review */
  reviewId: string | null;
  createdAt: string;
}
