/**
 * Postgres Repository (privy mode). postgres.js against DATABASE_URL; every
 * table lives in DB_SCHEMA (default "marketgym"), never `public`.
 *
 *  - `connection.search_path` pins unqualified table names to DB_SCHEMA
 *    (works through the Supabase session pooler); `prepare: false` keeps it
 *    compatible with transaction poolers.
 *  - schema.sql is applied once per process (advisory-locked, idempotent)
 *    before the first query.
 *  - the server is the only DB client: every learner query filters by user_id;
 *    scenarios are shared rows by design (see Repository).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import type { ActivityEvent, CoachSession, DiagnosticResult, MasteryRecord, PaperPortfolio, Profile, Review, Scenario, ScenarioAttempt } from "@/lib/types";
import type { KnowledgeCheckResult, Repository } from "../repository";
import {
  activityRow,
  assertSchemaIdentifier,
  attemptRow,
  coachRow,
  diagnosticRow,
  isUuid,
  kcRow,
  mapRows,
  masteryRow,
  portfolioRow,
  profileRow,
  renderSchemaSql,
  reviewRow,
  scenarioRow,
  toActivity,
  toAttempt,
  toKc,
  toMastery,
  toPortfolio,
  toProfile,
  toReview,
  userRow,
} from "./mappers";

export type Sql = postgres.Sql;

/** JSON columns: postgres.js serialises the value for the jsonb parameter. */
type Json = postgres.JSONValue;
const asJson = (v: unknown): Json => v as Json;

export interface PrivyUserRecord {
  id: string;
  privyDid: string;
  displayName: string | null;
  createdAt: string;
}

/** Path of schema.sql at runtime (next.config should trace it: see report). */
export function schemaSqlPath(): string {
  return path.join(process.cwd(), "lib", "db", "postgres", "schema.sql");
}

export function createSql(databaseUrl: string, schema: string): Sql {
  assertSchemaIdentifier(schema);
  return postgres(databaseUrl, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: false,
    connection: { search_path: schema, application_name: "marketgym" },
  });
}

export class PostgresRepository implements Repository {
  private ready: Promise<void> | null = null;

  constructor(
    private readonly sql: Sql,
    private readonly schema: string,
    private readonly loadSchemaSql: () => Promise<string> = () => fs.readFile(schemaSqlPath(), "utf8"),
  ) {
    assertSchemaIdentifier(schema);
  }

  /** Apply schema.sql once per process; a failure is retried on the next call. */
  private ensureSchema(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        const ddl = renderSchemaSql(await this.loadSchemaSql(), this.schema);
        await this.sql.begin(async (tx) => {
          // serialise concurrent cold starts; the lock is released at commit
          await tx`select pg_advisory_xact_lock(hashtext(${`marketgym:schema:${this.schema}`}))`;
          await tx.unsafe(ddl);
        });
      })().catch((err: unknown) => {
        this.ready = null;
        throw err;
      });
    }
    return this.ready;
  }

  private async db(): Promise<Sql> {
    await this.ensureSchema();
    return this.sql;
  }

  // ----- users (privy mode only; not part of Repository) -----

  /** Find-or-create by Privy DID. Never stores wallet addresses. */
  async upsertPrivyUser(privyDid: string, displayName: string): Promise<{ user: PrivyUserRecord; isNew: boolean }> {
    const sql = await this.db();
    const rows = await sql`
      insert into users (privy_did, display_name) values (${privyDid}, ${displayName})
      on conflict (privy_did) do update set privy_did = excluded.privy_did
      returning id::text as id, privy_did, display_name, created_at, (xmax = 0) as inserted`;
    const row = rows[0];
    if (!row) throw new Error("[postgres] upsertPrivyUser returned no row");
    const [u] = mapRows("upsertPrivyUser", [row], userRow, (r) => ({ id: r.id, privyDid: r.privy_did, displayName: r.display_name, createdAt: r.created_at }));
    return { user: u!, isNew: row.inserted === true };
  }

  /** Unix seconds before which session cookies are refused (set at sign-out), or null. */
  async getSessionsValidAfter(userId: string): Promise<number | null> {
    const sql = await this.db();
    const rows = await sql`select extract(epoch from sessions_valid_after)::float8 as t from users where id = ${userId}`;
    if (rows.length === 0) return Number.POSITIVE_INFINITY; // unknown user: no session is valid
    const t = (rows[0] as { t: number | null }).t;
    return t === null ? null : Math.floor(t);
  }

  async revokeSessions(userId: string): Promise<void> {
    const sql = await this.db();
    await sql`update users set sessions_valid_after = now() where id = ${userId}`;
  }

  async getUserById(id: string): Promise<PrivyUserRecord | null> {
    if (!isUuid(id)) return null;
    const sql = await this.db();
    const rows = await sql`select id::text as id, privy_did, display_name, created_at from users where id = ${id}`;
    return mapRows("getUserById", rows, userRow, (r) => ({ id: r.id, privyDid: r.privy_did, displayName: r.display_name, createdAt: r.created_at }))[0] ?? null;
  }

  // ----- profile -----

  async getProfile(userId: string): Promise<Profile | null> {
    if (!isUuid(userId)) return null;
    const sql = await this.db();
    const rows = await sql`select id::text as id, display_name, experience_level, learning_goal, preferred_learning_style, interests, onboarding_completed_at, created_at, updated_at from profiles where id = ${userId}`;
    return mapRows("getProfile", rows, profileRow, toProfile)[0] ?? null;
  }

  async upsertProfile(profile: Profile): Promise<Profile> {
    const sql = await this.db();
    const rows = await sql`
      insert into profiles (id, display_name, experience_level, learning_goal, preferred_learning_style, interests, onboarding_completed_at, created_at, updated_at)
      values (${profile.id}, ${profile.displayName}, ${profile.experienceLevel}, ${profile.learningGoal}, ${profile.preferredLearningStyle},
              ${profile.interests}::text[], ${profile.onboardingCompletedAt}, ${profile.createdAt}, ${profile.updatedAt})
      on conflict (id) do update set
        display_name = excluded.display_name,
        experience_level = excluded.experience_level,
        learning_goal = excluded.learning_goal,
        preferred_learning_style = excluded.preferred_learning_style,
        interests = excluded.interests,
        onboarding_completed_at = excluded.onboarding_completed_at,
        updated_at = excluded.updated_at
      returning id::text as id, display_name, experience_level, learning_goal, preferred_learning_style, interests, onboarding_completed_at, created_at, updated_at`;
    return mapRows("upsertProfile", rows, profileRow, toProfile)[0]!;
  }

  // ----- diagnostic -----

  async saveDiagnostic(result: DiagnosticResult): Promise<DiagnosticResult> {
    const sql = await this.db();
    const rows = await sql`
      insert into diagnostics (id, user_id, result, created_at)
      values (${result.id}, ${result.userId}, ${sql.json(asJson(result))}, ${result.createdAt})
      on conflict (id) do update set result = excluded.result where diagnostics.user_id = excluded.user_id
      returning result`;
    const saved = mapRows("saveDiagnostic", rows, diagnosticRow, (r) => r.result)[0];
    if (!saved) throw new Error("[postgres] saveDiagnostic: id belongs to another user");
    return saved;
  }

  async getLatestDiagnostic(userId: string): Promise<DiagnosticResult | null> {
    if (!isUuid(userId)) return null;
    const sql = await this.db();
    const rows = await sql`select result from diagnostics where user_id = ${userId} order by created_at desc limit 1`;
    return mapRows("getLatestDiagnostic", rows, diagnosticRow, (r) => r.result)[0] ?? null;
  }

  // ----- scenarios (shared rows) -----

  async saveScenario(scenario: Scenario): Promise<Scenario> {
    const sql = await this.db();
    const rows = await sql`
      insert into scenarios (id, template_id, title, description, difficulty, skill_ids, assessment_rubric, scenario_content, created_at)
      values (${scenario.id}, ${scenario.templateId}, ${scenario.title}, ${scenario.description}, ${scenario.difficulty},
              ${scenario.skillIds}::text[], ${sql.json(asJson(scenario.rubric))}, ${sql.json(asJson(scenario))}, ${scenario.createdAt})
      on conflict (id) do update set
        template_id = excluded.template_id, title = excluded.title, description = excluded.description,
        difficulty = excluded.difficulty, skill_ids = excluded.skill_ids,
        assessment_rubric = excluded.assessment_rubric, scenario_content = excluded.scenario_content
      returning scenario_content`;
    return mapRows("saveScenario", rows, scenarioRow, (r) => r.scenario_content)[0]!;
  }

  async getScenario(id: string): Promise<Scenario | null> {
    if (!isUuid(id)) return null;
    const sql = await this.db();
    const rows = await sql`select scenario_content from scenarios where id = ${id}`;
    return mapRows("getScenario", rows, scenarioRow, (r) => r.scenario_content)[0] ?? null;
  }

  async listScenariosByTemplate(templateId: string, limit: number): Promise<Scenario[]> {
    const sql = await this.db();
    const rows = await sql`select scenario_content from scenarios where template_id = ${templateId} order by created_at desc limit ${Math.max(0, Math.floor(limit))}`;
    return mapRows("listScenariosByTemplate", rows, scenarioRow, (r) => r.scenario_content);
  }

  // ----- attempts -----

  async saveAttempt(attempt: ScenarioAttempt): Promise<ScenarioAttempt> {
    const sql = await this.db();
    const rows = await sql`
      insert into scenario_attempts (id, user_id, scenario_id, template_id, skill_ids, submitted_answer, hints_used, rubric_scores, total_score, feedback, evaluation_confidence, created_at)
      values (${attempt.id}, ${attempt.userId}, ${attempt.scenarioId}, ${attempt.templateId ?? null}, ${attempt.skillIds}::text[],
              ${attempt.submittedAnswer}, ${attempt.hintsUsed}, ${sql.json(asJson(attempt.evaluation.rubricScores))},
              ${Math.round(attempt.evaluation.totalScore)}, ${sql.json(asJson(attempt.evaluation))}, ${attempt.evaluation.confidence}, ${attempt.createdAt})
      returning id::text as id, user_id::text as user_id, scenario_id::text as scenario_id, template_id, skill_ids, submitted_answer, hints_used, feedback, created_at`;
    return mapRows("saveAttempt", rows, attemptRow, toAttempt)[0]!;
  }

  async listAttempts(userId: string, opts?: { scenarioId?: string; limit?: number }): Promise<ScenarioAttempt[]> {
    if (!isUuid(userId)) return [];
    if (opts?.scenarioId !== undefined && !isUuid(opts.scenarioId)) return [];
    const sql = await this.db();
    const byScenario = opts?.scenarioId ? sql`and scenario_id = ${opts.scenarioId}` : sql``;
    const limit = opts?.limit !== undefined ? sql`limit ${Math.max(0, Math.floor(opts.limit))}` : sql``;
    const rows = await sql`
      select id::text as id, user_id::text as user_id, scenario_id::text as scenario_id, template_id, skill_ids, submitted_answer, hints_used, feedback, created_at
      from scenario_attempts where user_id = ${userId} ${byScenario} order by created_at desc ${limit}`;
    return mapRows("listAttempts", rows, attemptRow, toAttempt);
  }

  // ----- mastery -----

  private static readonly MASTERY_COLS = "user_id::text as user_id, skill_id, mastery_score, mastery_status, evidence_count, evidence, unresolved_misconception_ids, last_assessed_at, next_review_at, updated_at";

  async getMastery(userId: string, skillId: string): Promise<MasteryRecord | null> {
    if (!isUuid(userId)) return null;
    const sql = await this.db();
    const rows = await sql`select ${sql.unsafe(PostgresRepository.MASTERY_COLS)} from user_skill_mastery where user_id = ${userId} and skill_id = ${skillId}`;
    return mapRows("getMastery", rows, masteryRow, toMastery)[0] ?? null;
  }

  async listMastery(userId: string): Promise<MasteryRecord[]> {
    if (!isUuid(userId)) return [];
    const sql = await this.db();
    const rows = await sql`select ${sql.unsafe(PostgresRepository.MASTERY_COLS)} from user_skill_mastery where user_id = ${userId}`;
    return mapRows("listMastery", rows, masteryRow, toMastery);
  }

  async upsertMastery(record: MasteryRecord): Promise<MasteryRecord> {
    const sql = await this.db();
    const rows = await sql`
      insert into user_skill_mastery (user_id, skill_id, mastery_score, mastery_status, evidence_count, evidence, unresolved_misconception_ids, last_assessed_at, next_review_at, updated_at)
      values (${record.userId}, ${record.skillId}, ${Math.round(record.masteryScore)}, ${record.masteryStatus}, ${record.evidenceCount},
              ${sql.json(asJson(record.evidence))}, ${record.unresolvedMisconceptionIds}::text[], ${record.lastAssessedAt}, ${record.nextReviewAt}, ${record.updatedAt})
      on conflict (user_id, skill_id) do update set
        mastery_score = excluded.mastery_score, mastery_status = excluded.mastery_status, evidence_count = excluded.evidence_count,
        evidence = excluded.evidence, unresolved_misconception_ids = excluded.unresolved_misconception_ids,
        last_assessed_at = excluded.last_assessed_at, next_review_at = excluded.next_review_at, updated_at = excluded.updated_at
      returning ${sql.unsafe(PostgresRepository.MASTERY_COLS)}`;
    return mapRows("upsertMastery", rows, masteryRow, toMastery)[0]!;
  }

  // ----- reviews -----

  private static readonly REVIEW_COLS = "id::text as id, user_id::text as user_id, skill_id, scheduled_at, completed_at, result, attempt_id::text as attempt_id";

  async saveReview(review: Review): Promise<Review> {
    const sql = await this.db();
    const attemptId = isUuid(review.attemptId) ? review.attemptId : null;
    const rows = await sql`
      insert into learning_reviews (id, user_id, skill_id, scheduled_at, completed_at, result, attempt_id)
      values (${review.id}, ${review.userId}, ${review.skillId}, ${review.scheduledAt}, ${review.completedAt}, ${review.result}, ${attemptId})
      on conflict (id) do update set
        skill_id = excluded.skill_id, scheduled_at = excluded.scheduled_at, completed_at = excluded.completed_at,
        result = excluded.result, attempt_id = excluded.attempt_id
        where learning_reviews.user_id = excluded.user_id
      returning ${sql.unsafe(PostgresRepository.REVIEW_COLS)}`;
    const saved = mapRows("saveReview", rows, reviewRow, toReview)[0];
    if (!saved) throw new Error("[postgres] saveReview: id belongs to another user");
    return saved;
  }

  async getReview(userId: string, reviewId: string): Promise<Review | null> {
    if (!isUuid(userId) || !isUuid(reviewId)) return null;
    const sql = await this.db();
    const rows = await sql`select ${sql.unsafe(PostgresRepository.REVIEW_COLS)} from learning_reviews where user_id = ${userId} and id = ${reviewId}`;
    return mapRows("getReview", rows, reviewRow, toReview)[0] ?? null;
  }

  async listReviews(userId: string, opts?: { pending?: boolean }): Promise<Review[]> {
    if (!isUuid(userId)) return [];
    const sql = await this.db();
    const filter = opts?.pending === true ? sql`and completed_at is null` : opts?.pending === false ? sql`and completed_at is not null` : sql``;
    const rows = await sql`select ${sql.unsafe(PostgresRepository.REVIEW_COLS)} from learning_reviews where user_id = ${userId} ${filter} order by scheduled_at asc`;
    return mapRows("listReviews", rows, reviewRow, toReview);
  }

  // ----- coach -----

  async saveCoachSession(session: CoachSession): Promise<CoachSession> {
    const sql = await this.db();
    const rows = await sql`
      insert into coach_sessions (id, user_id, skill_id, module_id, session, status, created_at, updated_at)
      values (${session.id}, ${session.userId}, ${session.skillId}, ${session.moduleId}, ${sql.json(asJson(session))}, ${session.status}, ${session.createdAt}, ${session.updatedAt})
      on conflict (id) do update set
        session = excluded.session, status = excluded.status, updated_at = excluded.updated_at
        where coach_sessions.user_id = excluded.user_id
      returning session`;
    const saved = mapRows("saveCoachSession", rows, coachRow, (r) => r.session)[0];
    if (!saved) throw new Error("[postgres] saveCoachSession: id belongs to another user");
    return saved;
  }

  async getCoachSession(userId: string, sessionId: string): Promise<CoachSession | null> {
    if (!isUuid(userId)) return null;
    const sql = await this.db();
    const rows = await sql`select session from coach_sessions where user_id = ${userId} and id = ${sessionId}`;
    return mapRows("getCoachSession", rows, coachRow, (r) => r.session)[0] ?? null;
  }

  async listCoachSessions(userId: string, limit: number): Promise<CoachSession[]> {
    if (!isUuid(userId)) return [];
    const sql = await this.db();
    const rows = await sql`select session from coach_sessions where user_id = ${userId} order by updated_at desc limit ${Math.max(0, Math.floor(limit))}`;
    return mapRows("listCoachSessions", rows, coachRow, (r) => r.session);
  }

  // ----- activity -----

  private static readonly ACTIVITY_COLS = "id::text as id, user_id::text as user_id, kind, skill_ids, summary, score, ref_id, created_at";

  async logActivity(event: ActivityEvent): Promise<ActivityEvent> {
    const sql = await this.db();
    const rows = await sql`
      insert into activity_events (id, user_id, kind, skill_ids, summary, score, ref_id, created_at)
      values (${event.id}, ${event.userId}, ${event.kind}, ${event.skillIds}::text[], ${event.summary},
              ${event.score !== undefined ? Math.round(event.score) : null}, ${event.refId ?? null}, ${event.createdAt})
      returning ${sql.unsafe(PostgresRepository.ACTIVITY_COLS)}`;
    return mapRows("logActivity", rows, activityRow, toActivity)[0]!;
  }

  async listActivity(userId: string, limit: number): Promise<ActivityEvent[]> {
    if (!isUuid(userId)) return [];
    const sql = await this.db();
    const rows = await sql`select ${sql.unsafe(PostgresRepository.ACTIVITY_COLS)} from activity_events where user_id = ${userId} order by created_at desc limit ${Math.max(0, Math.floor(limit))}`;
    return mapRows("listActivity", rows, activityRow, toActivity);
  }

  // ----- practice portfolios -----

  async savePortfolio(p: PaperPortfolio): Promise<PaperPortfolio> {
    if (!isUuid(p.id)) throw new Error("[postgres] savePortfolio: portfolio id must be a uuid");
    const sql = await this.db();
    const rows = await sql`
      insert into paper_portfolios (id, user_id, name, portfolio, created_at, updated_at)
      values (${p.id}, ${p.userId}, ${p.name}, ${sql.json(asJson(p))}, ${p.createdAt}, ${p.updatedAt})
      on conflict (id) do update set
        name = excluded.name, portfolio = excluded.portfolio, updated_at = excluded.updated_at
        where paper_portfolios.user_id = excluded.user_id
      returning id::text as id, user_id::text as user_id, portfolio`;
    const saved = mapRows("savePortfolio", rows, portfolioRow, toPortfolio)[0];
    if (!saved) throw new Error("[postgres] savePortfolio: portfolio belongs to another user");
    return saved;
  }

  async getPortfolio(userId: string, id: string): Promise<PaperPortfolio | null> {
    if (!isUuid(userId) || !isUuid(id)) return null;
    const sql = await this.db();
    const rows = await sql`select id::text as id, user_id::text as user_id, portfolio from paper_portfolios where user_id = ${userId} and id = ${id}`;
    return mapRows("getPortfolio", rows, portfolioRow, toPortfolio)[0] ?? null;
  }

  async listPortfolios(userId: string): Promise<PaperPortfolio[]> {
    if (!isUuid(userId)) return [];
    const sql = await this.db();
    const rows = await sql`select id::text as id, user_id::text as user_id, portfolio from paper_portfolios where user_id = ${userId} order by updated_at desc`;
    return mapRows("listPortfolios", rows, portfolioRow, toPortfolio);
  }

  // ----- knowledge checks -----

  private static readonly KC_COLS = "id::text as id, user_id::text as user_id, skill_id, knowledge_check_id, option_id, correct, misconception_id, review_id::text as review_id, created_at";

  async saveKnowledgeCheckResult(r: KnowledgeCheckResult): Promise<KnowledgeCheckResult> {
    const sql = await this.db();
    const reviewId = isUuid(r.reviewId) ? r.reviewId : null;
    const rows = await sql`
      insert into knowledge_check_results (id, user_id, skill_id, knowledge_check_id, option_id, correct, misconception_id, review_id, created_at)
      values (${r.id}, ${r.userId}, ${r.skillId}, ${r.knowledgeCheckId}, ${r.optionId}, ${r.correct}, ${r.misconceptionId}, ${reviewId}, ${r.createdAt})
      returning ${sql.unsafe(PostgresRepository.KC_COLS)}`;
    return mapRows("saveKnowledgeCheckResult", rows, kcRow, toKc)[0]!;
  }

  async listKnowledgeCheckResults(userId: string, skillId?: string): Promise<KnowledgeCheckResult[]> {
    if (!isUuid(userId)) return [];
    const sql = await this.db();
    const bySkill = skillId ? sql`and skill_id = ${skillId}` : sql``;
    const rows = await sql`select ${sql.unsafe(PostgresRepository.KC_COLS)} from knowledge_check_results where user_id = ${userId} ${bySkill} order by created_at desc`;
    return mapRows("listKnowledgeCheckResults", rows, kcRow, toKc);
  }
}

// one pool per (url, schema) per process
const pools = new Map<string, PostgresRepository>();

export function getPostgresRepository(databaseUrl: string, schema: string): PostgresRepository {
  const key = `${schema}\u0000${databaseUrl}`;
  let repo = pools.get(key);
  if (!repo) {
    repo = new PostgresRepository(createSql(databaseUrl, schema), schema);
    pools.set(key, repo);
  }
  return repo;
}
