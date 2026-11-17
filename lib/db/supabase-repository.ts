/**
 * Supabase Repository. Maps supabase/migrations/0001_init.sql tables to the
 * lib/types contracts.
 *
 *  - user-owned reads AND writes for profiles, diagnostics, attempts,
 *    knowledge-check results and coach sessions go through the caller's
 *    cookie-bound client, so RLS ("own …" policies) is honoured;
 *  - mastery, reviews, activity and scenarios are server-derived: learners
 *    only have SELECT on them, so writes use the service-role client and
 *    reads use the user client (RLS still scopes them to auth.uid()).
 *
 * Every row is Zod-validated on the way out; no `any` leaks from supabase-js.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/auth/supabase";
import type {
  ActivityEvent,
  CoachSession,
  DiagnosticResult,
  Evaluation,
  MasteryRecord,
  Profile,
  Review,
  Scenario,
  ScenarioAttempt,
} from "@/lib/types";
import type { KnowledgeCheckResult, Repository } from "./repository";

// ---------- row schemas (what Postgres hands back) ----------

const iso = z.string();
const isoNullable = z.string().nullable();

const profileRow = z.object({
  id: z.string(),
  display_name: z.string(),
  experience_level: z.enum(["new", "some", "experienced"]),
  learning_goal: z.enum(["understand-news", "read-market-data", "analyst-career", "etf-and-indexes", "market-structure"]),
  preferred_learning_style: z.enum(["concise", "detailed", "examples"]),
  interests: z.array(z.string()),
  onboarding_completed_at: isoNullable,
  created_at: iso,
  updated_at: iso,
});

const diagnosticRow = z.object({ id: z.string(), user_id: z.string(), result: z.custom<DiagnosticResult>((v) => typeof v === "object" && v !== null), created_at: iso });

const scenarioRow = z.object({ id: z.string(), scenario_content: z.custom<Scenario>((v) => typeof v === "object" && v !== null) });

const attemptRow = z.object({
  id: z.string(),
  user_id: z.string(),
  scenario_id: z.string(),
  template_id: z.string().nullable().optional(),
  skill_ids: z.array(z.string()),
  submitted_answer: z.string(),
  hints_used: z.number(),
  feedback: z.custom<Evaluation>((v) => typeof v === "object" && v !== null),
  created_at: iso,
});

const masteryRow = z.object({
  user_id: z.string(),
  skill_id: z.string(),
  mastery_score: z.number(),
  mastery_status: z.enum(["not-started", "learning", "practising", "mastered"]),
  evidence_count: z.number(),
  evidence: z.array(
    z.object({
      attemptId: z.string(),
      score: z.number(),
      at: z.string(),
      kind: z.enum(["scenario", "knowledge-check", "retention-check", "orderbook"]),
    }),
  ),
  unresolved_misconception_ids: z.array(z.string()),
  last_assessed_at: isoNullable,
  next_review_at: isoNullable,
  updated_at: iso,
});

const reviewRow = z.object({
  id: z.string(),
  user_id: z.string(),
  skill_id: z.string(),
  scheduled_at: iso,
  completed_at: isoNullable,
  result: z.enum(["passed", "failed"]).nullable(),
  attempt_id: z.string().nullable(),
});

const kcRow = z.object({
  id: z.string(),
  user_id: z.string(),
  skill_id: z.string(),
  knowledge_check_id: z.string(),
  option_id: z.string(),
  correct: z.boolean(),
  misconception_id: z.string().nullable(),
  review_id: z.string().nullable(),
  created_at: iso,
});

const coachRow = z.object({ id: z.string(), user_id: z.string(), session: z.custom<CoachSession>((v) => typeof v === "object" && v !== null) });

const activityRow = z.object({
  id: z.string(),
  user_id: z.string(),
  kind: z.enum(["diagnostic", "lesson", "knowledge-check", "scenario", "orderbook", "review", "coach"]),
  skill_ids: z.array(z.string()),
  summary: z.string(),
  score: z.number().nullable(),
  ref_id: z.string().nullable(),
  created_at: iso,
});

// ---------- mappers ----------

function toProfile(r: z.infer<typeof profileRow>): Profile {
  return {
    id: r.id,
    displayName: r.display_name,
    experienceLevel: r.experience_level,
    learningGoal: r.learning_goal,
    preferredLearningStyle: r.preferred_learning_style,
    interests: r.interests,
    onboardingCompletedAt: r.onboarding_completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toAttempt(r: z.infer<typeof attemptRow>): ScenarioAttempt {
  return {
    id: r.id,
    userId: r.user_id,
    scenarioId: r.scenario_id,
    templateId: r.template_id ?? undefined,
    skillIds: r.skill_ids,
    submittedAnswer: r.submitted_answer,
    hintsUsed: r.hints_used,
    evaluation: r.feedback,
    createdAt: r.created_at,
  };
}

function toMastery(r: z.infer<typeof masteryRow>): MasteryRecord {
  return {
    userId: r.user_id,
    skillId: r.skill_id,
    masteryScore: r.mastery_score,
    masteryStatus: r.mastery_status,
    evidenceCount: r.evidence_count,
    evidence: r.evidence,
    unresolvedMisconceptionIds: r.unresolved_misconception_ids,
    lastAssessedAt: r.last_assessed_at,
    nextReviewAt: r.next_review_at,
    updatedAt: r.updated_at,
  };
}

function toReview(r: z.infer<typeof reviewRow>): Review {
  return {
    id: r.id,
    userId: r.user_id,
    skillId: r.skill_id,
    scheduledAt: r.scheduled_at,
    completedAt: r.completed_at,
    result: r.result,
    attemptId: r.attempt_id,
  };
}

function toKc(r: z.infer<typeof kcRow>): KnowledgeCheckResult {
  return {
    id: r.id,
    userId: r.user_id,
    skillId: r.skill_id,
    knowledgeCheckId: r.knowledge_check_id,
    optionId: r.option_id,
    correct: r.correct,
    misconceptionId: r.misconception_id,
    reviewId: r.review_id,
    createdAt: r.created_at,
  };
}

function toActivity(r: z.infer<typeof activityRow>): ActivityEvent {
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind,
    skillIds: r.skill_ids,
    summary: r.summary,
    ...(r.score !== null ? { score: r.score } : {}),
    ...(r.ref_id !== null ? { refId: r.ref_id } : {}),
    createdAt: r.created_at,
  };
}

class DbError extends Error {
  constructor(op: string, message: string) {
    super(`[supabase] ${op}: ${message}`);
    this.name = "DbError";
  }
}

function unwrap<T>(op: string, res: { data: unknown; error: { message: string } | null }, schema: z.ZodType<T>): T {
  if (res.error) throw new DbError(op, res.error.message);
  return schema.parse(res.data);
}

const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SupabaseRepository implements Repository {
  constructor(
    private readonly user: SupabaseClient,
    private readonly service: () => SupabaseClient,
  ) {}

  // ----- profile -----

  async getProfile(userId: string): Promise<Profile | null> {
    const res = await this.user.from("profiles").select("*").eq("id", userId).maybeSingle();
    const row = unwrap("getProfile", res, profileRow.nullable());
    return row ? toProfile(row) : null;
  }

  async upsertProfile(profile: Profile): Promise<Profile> {
    const res = await this.user
      .from("profiles")
      .upsert(
        {
          id: profile.id,
          display_name: profile.displayName,
          experience_level: profile.experienceLevel,
          learning_goal: profile.learningGoal,
          preferred_learning_style: profile.preferredLearningStyle,
          interests: profile.interests,
          onboarding_completed_at: profile.onboardingCompletedAt,
          updated_at: profile.updatedAt,
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();
    return toProfile(unwrap("upsertProfile", res, profileRow));
  }

  // ----- diagnostic -----

  async saveDiagnostic(result: DiagnosticResult): Promise<DiagnosticResult> {
    // server-only write (service role): learners have read-only RLS on diagnostics
    const res = await this.service()
      .from("diagnostics")
      .insert({ id: result.id, user_id: result.userId, result, created_at: result.createdAt })
      .select("*")
      .single();
    return unwrap("saveDiagnostic", res, diagnosticRow).result;
  }

  async getLatestDiagnostic(userId: string): Promise<DiagnosticResult | null> {
    const res = await this.user.from("diagnostics").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const row = unwrap("getLatestDiagnostic", res, diagnosticRow.nullable());
    return row ? row.result : null;
  }

  // ----- scenarios (service-role writes; authenticated reads) -----

  async saveScenario(scenario: Scenario): Promise<Scenario> {
    const res = await this.service()
      .from("scenarios")
      .upsert(
        {
          id: scenario.id,
          template_id: scenario.templateId,
          title: scenario.title,
          description: scenario.description,
          difficulty: scenario.difficulty,
          skill_ids: scenario.skillIds,
          assessment_rubric: scenario.rubric,
          scenario_content: scenario,
          created_at: scenario.createdAt,
        },
        { onConflict: "id" },
      )
      .select("id, scenario_content")
      .single();
    return unwrap("saveScenario", res, scenarioRow).scenario_content;
  }

  async getScenario(id: string): Promise<Scenario | null> {
    if (!uuidLike.test(id)) return null;
    const res = await this.user.from("scenarios").select("id, scenario_content").eq("id", id).maybeSingle();
    const row = unwrap("getScenario", res, scenarioRow.nullable());
    return row ? row.scenario_content : null;
  }

  async listScenariosByTemplate(templateId: string, limit: number): Promise<Scenario[]> {
    const res = await this.user
      .from("scenarios")
      .select("id, scenario_content")
      .eq("template_id", templateId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return unwrap("listScenariosByTemplate", res, z.array(scenarioRow)).map((r) => r.scenario_content);
  }

  async saveAttempt(attempt: ScenarioAttempt): Promise<ScenarioAttempt> {
    // server-only write (service role): learners have read-only RLS on scenario_attempts
    const res = await this.service()
      .from("scenario_attempts")
      .insert({
        id: attempt.id,
        user_id: attempt.userId,
        scenario_id: attempt.scenarioId,
        template_id: attempt.templateId ?? null,
        skill_ids: attempt.skillIds,
        submitted_answer: attempt.submittedAnswer,
        hints_used: attempt.hintsUsed,
        rubric_scores: attempt.evaluation.rubricScores,
        total_score: Math.round(attempt.evaluation.totalScore),
        feedback: attempt.evaluation,
        evaluation_confidence: attempt.evaluation.confidence,
        created_at: attempt.createdAt,
      })
      .select("*")
      .single();
    return toAttempt(unwrap("saveAttempt", res, attemptRow));
  }

  async listAttempts(userId: string, opts?: { scenarioId?: string; limit?: number }): Promise<ScenarioAttempt[]> {
    let q = this.user.from("scenario_attempts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (opts?.scenarioId) q = q.eq("scenario_id", opts.scenarioId);
    if (opts?.limit !== undefined) q = q.limit(opts.limit);
    return unwrap("listAttempts", await q, z.array(attemptRow)).map(toAttempt);
  }

  // ----- mastery (service writes) -----

  async getMastery(userId: string, skillId: string): Promise<MasteryRecord | null> {
    const res = await this.user.from("user_skill_mastery").select("*").eq("user_id", userId).eq("skill_id", skillId).maybeSingle();
    const row = unwrap("getMastery", res, masteryRow.nullable());
    return row ? toMastery(row) : null;
  }

  async listMastery(userId: string): Promise<MasteryRecord[]> {
    const res = await this.user.from("user_skill_mastery").select("*").eq("user_id", userId);
    return unwrap("listMastery", res, z.array(masteryRow)).map(toMastery);
  }

  async upsertMastery(record: MasteryRecord): Promise<MasteryRecord> {
    const res = await this.service()
      .from("user_skill_mastery")
      .upsert(
        {
          user_id: record.userId,
          skill_id: record.skillId,
          mastery_score: Math.round(record.masteryScore),
          mastery_status: record.masteryStatus,
          evidence_count: record.evidenceCount,
          evidence: record.evidence,
          unresolved_misconception_ids: record.unresolvedMisconceptionIds,
          last_assessed_at: record.lastAssessedAt,
          next_review_at: record.nextReviewAt,
          updated_at: record.updatedAt,
        },
        { onConflict: "user_id,skill_id" },
      )
      .select("*")
      .single();
    return toMastery(unwrap("upsertMastery", res, masteryRow));
  }

  // ----- reviews (service writes) -----

  async saveReview(review: Review): Promise<Review> {
    const res = await this.service()
      .from("learning_reviews")
      .upsert(
        {
          id: review.id,
          user_id: review.userId,
          skill_id: review.skillId,
          scheduled_at: review.scheduledAt,
          completed_at: review.completedAt,
          result: review.result,
          attempt_id: review.attemptId && uuidLike.test(review.attemptId) ? review.attemptId : null,
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();
    return toReview(unwrap("saveReview", res, reviewRow));
  }

  async getReview(userId: string, reviewId: string): Promise<Review | null> {
    if (!uuidLike.test(reviewId)) return null;
    const res = await this.user.from("learning_reviews").select("*").eq("user_id", userId).eq("id", reviewId).maybeSingle();
    const row = unwrap("getReview", res, reviewRow.nullable());
    return row ? toReview(row) : null;
  }

  async listReviews(userId: string, opts?: { pending?: boolean }): Promise<Review[]> {
    let q = this.user.from("learning_reviews").select("*").eq("user_id", userId).order("scheduled_at", { ascending: true });
    if (opts?.pending === true) q = q.is("completed_at", null);
    else if (opts?.pending === false) q = q.not("completed_at", "is", null);
    return unwrap("listReviews", await q, z.array(reviewRow)).map(toReview);
  }

  // ----- coach -----

  async saveCoachSession(session: CoachSession): Promise<CoachSession> {
    // server-only write (service role): learners have read-only RLS on coach_sessions
    const res = await this.service()
      .from("coach_sessions")
      .upsert(
        {
          id: session.id,
          user_id: session.userId,
          skill_id: session.skillId,
          module_id: session.moduleId,
          session,
          status: session.status,
          created_at: session.createdAt,
          updated_at: session.updatedAt,
        },
        { onConflict: "id" },
      )
      .select("id, user_id, session")
      .single();
    return unwrap("saveCoachSession", res, coachRow).session;
  }

  async getCoachSession(userId: string, sessionId: string): Promise<CoachSession | null> {
    if (!uuidLike.test(sessionId)) return null;
    const res = await this.user.from("coach_sessions").select("id, user_id, session").eq("user_id", userId).eq("id", sessionId).maybeSingle();
    const row = unwrap("getCoachSession", res, coachRow.nullable());
    return row ? row.session : null;
  }

  async listCoachSessions(userId: string, limit: number): Promise<CoachSession[]> {
    const res = await this.user
      .from("coach_sessions")
      .select("id, user_id, session")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);
    return unwrap("listCoachSessions", res, z.array(coachRow)).map((r) => r.session);
  }

  // ----- activity (service writes) -----

  async logActivity(event: ActivityEvent): Promise<ActivityEvent> {
    const res = await this.service()
      .from("activity_events")
      .insert({
        id: event.id,
        user_id: event.userId,
        kind: event.kind,
        skill_ids: event.skillIds,
        summary: event.summary,
        score: event.score !== undefined ? Math.round(event.score) : null,
        ref_id: event.refId ?? null,
        created_at: event.createdAt,
      })
      .select("*")
      .single();
    return toActivity(unwrap("logActivity", res, activityRow));
  }

  async listActivity(userId: string, limit: number): Promise<ActivityEvent[]> {
    const res = await this.user.from("activity_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    return unwrap("listActivity", res, z.array(activityRow)).map(toActivity);
  }

  // ----- knowledge checks -----

  async saveKnowledgeCheckResult(r: KnowledgeCheckResult): Promise<KnowledgeCheckResult> {
    // server-only write (service role): learners have read-only RLS on knowledge_check_results
    const res = await this.service()
      .from("knowledge_check_results")
      .insert({
        id: r.id,
        user_id: r.userId,
        skill_id: r.skillId,
        knowledge_check_id: r.knowledgeCheckId,
        option_id: r.optionId,
        correct: r.correct,
        misconception_id: r.misconceptionId,
        review_id: r.reviewId,
        created_at: r.createdAt,
      })
      .select("*")
      .single();
    return toKc(unwrap("saveKnowledgeCheckResult", res, kcRow));
  }

  async listKnowledgeCheckResults(userId: string, skillId?: string): Promise<KnowledgeCheckResult[]> {
    let q = this.user.from("knowledge_check_results").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (skillId) q = q.eq("skill_id", skillId);
    return unwrap("listKnowledgeCheckResults", await q, z.array(kcRow)).map(toKc);
  }
}

export async function createSupabaseRepository(): Promise<SupabaseRepository> {
  const user = await createSupabaseServerClient();
  return new SupabaseRepository(user, createSupabaseServiceClient);
}
