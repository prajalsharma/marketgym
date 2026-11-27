/**
 * SQL-free pieces of the Postgres repository: schema-identifier handling,
 * schema.sql rendering and row → contract mappers. Kept separate so they are
 * unit-testable without a database.
 */
import { z } from "zod";
import type {
  ActivityEvent,
  CoachSession,
  DiagnosticResult,
  Evaluation,
  MasteryRecord,
  PaperPortfolio,
  Profile,
  Review,
  Scenario,
  ScenarioAttempt,
} from "@/lib/types";
import type { KnowledgeCheckResult } from "../repository";

// ---------- schema identifier ----------

/** Same rule as DB_SCHEMA in lib/config/env.ts: a plain lowercase identifier. */
const SCHEMA_IDENTIFIER = /^[a-z_][a-z0-9_]{0,40}$/;

/**
 * Validate DB_SCHEMA again at the point of use (defence in depth: it is
 * interpolated into DDL). `public` is refused: that schema belongs to another app.
 */
export function assertSchemaIdentifier(name: string): string {
  if (!SCHEMA_IDENTIFIER.test(name)) throw new Error(`DB_SCHEMA "${name}" is not a plain lowercase identifier.`);
  if (name === "public" || name.startsWith("pg_") || name === "information_schema") {
    throw new Error(`DB_SCHEMA "${name}" is reserved; MarketGym never touches it.`);
  }
  return name;
}

export const SCHEMA_PLACEHOLDER = "__SCHEMA__";

/** schema.sql with every `__SCHEMA__` replaced by the double-quoted, validated identifier. */
export function renderSchemaSql(template: string, schema: string): string {
  const ident = `"${assertSchemaIdentifier(schema)}"`;
  if (!template.includes(SCHEMA_PLACEHOLDER)) throw new Error("schema.sql has no __SCHEMA__ placeholder");
  return template.split(SCHEMA_PLACEHOLDER).join(ident);
}

// ---------- ids ----------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: string | null | undefined): v is string {
  return typeof v === "string" && UUID.test(v);
}

// ---------- row schemas (what postgres.js hands back) ----------

/** timestamptz arrives as a Date; accept strings too (simple-protocol/text paths). */
const ts = z.union([z.date(), z.string()]).transform((v) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString()));
const tsNullable = ts.nullable();
const obj = <T>() => z.custom<T>((v) => typeof v === "object" && v !== null);

export const userRow = z.object({ id: z.string(), privy_did: z.string(), display_name: z.string().nullable(), created_at: ts });

export const profileRow = z.object({
  id: z.string(),
  display_name: z.string(),
  experience_level: z.enum(["new", "some", "experienced"]),
  learning_goal: z.enum(["understand-news", "read-market-data", "analyst-career", "etf-and-indexes", "market-structure"]),
  preferred_learning_style: z.enum(["concise", "detailed", "examples"]),
  interests: z.array(z.string()),
  onboarding_completed_at: tsNullable,
  created_at: ts,
  updated_at: ts,
});

export const diagnosticRow = z.object({ result: obj<DiagnosticResult>() });
export const scenarioRow = z.object({ scenario_content: obj<Scenario>() });

export const attemptRow = z.object({
  id: z.string(),
  user_id: z.string(),
  scenario_id: z.string(),
  template_id: z.string().nullable(),
  skill_ids: z.array(z.string()),
  submitted_answer: z.string(),
  hints_used: z.number(),
  feedback: obj<Evaluation>(),
  created_at: ts,
});

export const masteryRow = z.object({
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
  last_assessed_at: tsNullable,
  next_review_at: tsNullable,
  updated_at: ts,
});

export const reviewRow = z.object({
  id: z.string(),
  user_id: z.string(),
  skill_id: z.string(),
  scheduled_at: ts,
  completed_at: tsNullable,
  result: z.enum(["passed", "failed"]).nullable(),
  attempt_id: z.string().nullable(),
});

export const kcRow = z.object({
  id: z.string(),
  user_id: z.string(),
  skill_id: z.string(),
  knowledge_check_id: z.string(),
  option_id: z.string(),
  correct: z.boolean(),
  misconception_id: z.string().nullable(),
  review_id: z.string().nullable(),
  created_at: ts,
});

export const coachRow = z.object({ session: obj<CoachSession>() });

export const activityRow = z.object({
  id: z.string(),
  user_id: z.string(),
  kind: z.enum(["diagnostic", "lesson", "knowledge-check", "scenario", "orderbook", "review", "coach", "portfolio"]),
  skill_ids: z.array(z.string()),
  summary: z.string(),
  score: z.number().nullable(),
  ref_id: z.string().nullable(),
  created_at: ts,
});

export const portfolioRow = z.object({ id: z.string(), user_id: z.string(), portfolio: obj<PaperPortfolio>() });

// ---------- mappers ----------

export function toProfile(r: z.infer<typeof profileRow>): Profile {
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

export function toAttempt(r: z.infer<typeof attemptRow>): ScenarioAttempt {
  return {
    id: r.id,
    userId: r.user_id,
    scenarioId: r.scenario_id,
    ...(r.template_id !== null ? { templateId: r.template_id } : {}),
    skillIds: r.skill_ids,
    submittedAnswer: r.submitted_answer,
    hintsUsed: r.hints_used,
    evaluation: r.feedback,
    createdAt: r.created_at,
  };
}

export function toMastery(r: z.infer<typeof masteryRow>): MasteryRecord {
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

export function toReview(r: z.infer<typeof reviewRow>): Review {
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

export function toKc(r: z.infer<typeof kcRow>): KnowledgeCheckResult {
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

export function toActivity(r: z.infer<typeof activityRow>): ActivityEvent {
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

/** Stored JSON is authoritative for content; id/userId always come from the row columns. */
export function toPortfolio(r: z.infer<typeof portfolioRow>): PaperPortfolio {
  return { ...r.portfolio, id: r.id, userId: r.user_id };
}

/** Rows → contract objects, Zod-validated; throws on drift instead of leaking `any`. */
export function mapRows<S extends z.ZodType, T>(op: string, rows: readonly unknown[], schema: S, map: (r: z.infer<S>) => T): T[] {
  return rows.map((row, i) => {
    const parsed = schema.safeParse(row);
    if (!parsed.success) throw new Error(`[postgres] ${op}: row ${i} failed validation: ${parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
    return map(parsed.data);
  });
}

