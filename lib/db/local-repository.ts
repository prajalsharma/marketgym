/**
 * Local JSON-file Repository. One file, atomic writes (tmp + rename), an
 * in-process mutex so concurrent route handlers serialise their writes, and
 * every method scoped by userId. For demos and E2E, not multi-user prod.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
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
import type { KnowledgeCheckResult, Repository } from "./repository";

interface LocalStore {
  version: 1;
  profiles: Record<string, Profile>;
  diagnostics: DiagnosticResult[];
  scenarios: Record<string, Scenario>;
  attempts: ScenarioAttempt[];
  mastery: MasteryRecord[];
  reviews: Review[];
  coachSessions: CoachSession[];
  activity: ActivityEvent[];
  knowledgeCheckResults: KnowledgeCheckResult[];
}

function emptyStore(): LocalStore {
  return {
    version: 1,
    profiles: {},
    diagnostics: [],
    scenarios: {},
    attempts: [],
    mastery: [],
    reviews: [],
    coachSessions: [],
    activity: [],
    knowledgeCheckResults: [],
  };
}

/** The data file path. The lead's build brief fixes this env var explicitly. */
export function localDataFilePath(): string {
  const configured = process.env.MARKETGYM_DATA_FILE;
  return path.resolve(process.cwd(), configured && configured.length > 0 ? configured : ".data/marketgym.json");
}

const byNewest = <T extends { createdAt: string }>(a: T, b: T): number => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);

const clone = <T>(v: T): T => structuredClone(v);

export class LocalRepository implements Repository {
  private store: LocalStore | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private loadedMtimeMs = -1;

  constructor(private readonly filePath: string) {}

  // ----- infrastructure -----

  /** Serialise all reads+writes through one promise chain (in-process mutex). */
  private run<T>(task: (store: LocalStore) => Promise<T> | T, opts: { write: boolean }): Promise<T> {
    const next = this.queue.then(async () => {
      const store = await this.load();
      const result = await task(store);
      if (opts.write) await this.persist(store);
      return result;
    });
    // keep the chain alive even if a task rejects
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async load(): Promise<LocalStore> {
    try {
      const stat = await fs.stat(this.filePath);
      if (this.store && stat.mtimeMs === this.loadedMtimeMs) return this.store;
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = raw.trim().length > 0 ? (JSON.parse(raw) as Partial<LocalStore>) : {};
      this.store = { ...emptyStore(), ...parsed, version: 1 };
      this.loadedMtimeMs = stat.mtimeMs;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        console.warn(`[local-repository] could not read ${this.filePath}; starting empty`, err instanceof Error ? err.message : err);
      }
      if (!this.store) this.store = emptyStore();
    }
    return this.store;
  }

  private async persist(store: LocalStore): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
    await fs.rename(tmp, this.filePath);
    const stat = await fs.stat(this.filePath);
    this.loadedMtimeMs = stat.mtimeMs;
  }

  // ----- profile -----

  getProfile(userId: string): Promise<Profile | null> {
    return this.run((s) => clone(s.profiles[userId] ?? null), { write: false });
  }

  upsertProfile(profile: Profile): Promise<Profile> {
    return this.run(
      (s) => {
        s.profiles[profile.id] = clone(profile);
        return clone(profile);
      },
      { write: true },
    );
  }

  // ----- diagnostic -----

  saveDiagnostic(result: DiagnosticResult): Promise<DiagnosticResult> {
    return this.run(
      (s) => {
        s.diagnostics = s.diagnostics.filter((d) => d.id !== result.id);
        s.diagnostics.push(clone(result));
        return clone(result);
      },
      { write: true },
    );
  }

  getLatestDiagnostic(userId: string): Promise<DiagnosticResult | null> {
    return this.run(
      (s) => {
        const mine = s.diagnostics.filter((d) => d.userId === userId).sort(byNewest);
        return clone(mine[0] ?? null);
      },
      { write: false },
    );
  }

  // ----- scenarios -----

  saveScenario(scenario: Scenario): Promise<Scenario> {
    return this.run(
      (s) => {
        s.scenarios[scenario.id] = clone(scenario);
        return clone(scenario);
      },
      { write: true },
    );
  }

  getScenario(id: string): Promise<Scenario | null> {
    return this.run((s) => clone(s.scenarios[id] ?? null), { write: false });
  }

  listScenariosByTemplate(templateId: string, limit: number): Promise<Scenario[]> {
    return this.run(
      (s) =>
        clone(
          Object.values(s.scenarios)
            .filter((sc) => sc.templateId === templateId)
            .sort(byNewest)
            .slice(0, Math.max(0, limit)),
        ),
      { write: false },
    );
  }

  saveAttempt(attempt: ScenarioAttempt): Promise<ScenarioAttempt> {
    return this.run(
      (s) => {
        s.attempts = s.attempts.filter((a) => a.id !== attempt.id);
        s.attempts.push(clone(attempt));
        return clone(attempt);
      },
      { write: true },
    );
  }

  listAttempts(userId: string, opts?: { scenarioId?: string; limit?: number }): Promise<ScenarioAttempt[]> {
    return this.run(
      (s) => {
        let list = s.attempts.filter((a) => a.userId === userId);
        if (opts?.scenarioId) list = list.filter((a) => a.scenarioId === opts.scenarioId);
        list = list.sort(byNewest);
        if (opts?.limit !== undefined) list = list.slice(0, Math.max(0, opts.limit));
        return clone(list);
      },
      { write: false },
    );
  }

  // ----- mastery -----

  getMastery(userId: string, skillId: string): Promise<MasteryRecord | null> {
    return this.run((s) => clone(s.mastery.find((m) => m.userId === userId && m.skillId === skillId) ?? null), { write: false });
  }

  listMastery(userId: string): Promise<MasteryRecord[]> {
    return this.run((s) => clone(s.mastery.filter((m) => m.userId === userId)), { write: false });
  }

  upsertMastery(record: MasteryRecord): Promise<MasteryRecord> {
    return this.run(
      (s) => {
        const i = s.mastery.findIndex((m) => m.userId === record.userId && m.skillId === record.skillId);
        if (i >= 0) s.mastery[i] = clone(record);
        else s.mastery.push(clone(record));
        return clone(record);
      },
      { write: true },
    );
  }

  // ----- reviews -----

  saveReview(review: Review): Promise<Review> {
    return this.run(
      (s) => {
        const i = s.reviews.findIndex((r) => r.id === review.id);
        if (i >= 0) s.reviews[i] = clone(review);
        else s.reviews.push(clone(review));
        return clone(review);
      },
      { write: true },
    );
  }

  getReview(userId: string, reviewId: string): Promise<Review | null> {
    return this.run((s) => clone(s.reviews.find((r) => r.id === reviewId && r.userId === userId) ?? null), { write: false });
  }

  listReviews(userId: string, opts?: { pending?: boolean }): Promise<Review[]> {
    return this.run(
      (s) => {
        let list = s.reviews.filter((r) => r.userId === userId);
        if (opts?.pending === true) list = list.filter((r) => r.completedAt === null);
        else if (opts?.pending === false) list = list.filter((r) => r.completedAt !== null);
        list = list.sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : a.scheduledAt > b.scheduledAt ? 1 : 0));
        return clone(list);
      },
      { write: false },
    );
  }

  // ----- coach -----

  saveCoachSession(session: CoachSession): Promise<CoachSession> {
    return this.run(
      (s) => {
        const i = s.coachSessions.findIndex((c) => c.id === session.id);
        if (i >= 0) s.coachSessions[i] = clone(session);
        else s.coachSessions.push(clone(session));
        return clone(session);
      },
      { write: true },
    );
  }

  getCoachSession(userId: string, sessionId: string): Promise<CoachSession | null> {
    return this.run((s) => clone(s.coachSessions.find((c) => c.id === sessionId && c.userId === userId) ?? null), { write: false });
  }

  listCoachSessions(userId: string, limit: number): Promise<CoachSession[]> {
    return this.run(
      (s) =>
        clone(
          s.coachSessions
            .filter((c) => c.userId === userId)
            .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
            .slice(0, Math.max(0, limit)),
        ),
      { write: false },
    );
  }

  // ----- activity -----

  logActivity(event: ActivityEvent): Promise<ActivityEvent> {
    return this.run(
      (s) => {
        s.activity.push(clone(event));
        return clone(event);
      },
      { write: true },
    );
  }

  listActivity(userId: string, limit: number): Promise<ActivityEvent[]> {
    return this.run(
      (s) =>
        clone(
          s.activity
            .filter((a) => a.userId === userId)
            .sort(byNewest)
            .slice(0, Math.max(0, limit)),
        ),
      { write: false },
    );
  }

  // ----- knowledge checks -----

  saveKnowledgeCheckResult(r: KnowledgeCheckResult): Promise<KnowledgeCheckResult> {
    return this.run(
      (s) => {
        s.knowledgeCheckResults = s.knowledgeCheckResults.filter((k) => k.id !== r.id);
        s.knowledgeCheckResults.push(clone(r));
        return clone(r);
      },
      { write: true },
    );
  }

  listKnowledgeCheckResults(userId: string, skillId?: string): Promise<KnowledgeCheckResult[]> {
    return this.run(
      (s) =>
        clone(
          s.knowledgeCheckResults
            .filter((k) => k.userId === userId && (skillId === undefined || k.skillId === skillId))
            .sort(byNewest),
        ),
      { write: false },
    );
  }
}

export function createLocalRepository(filePath = localDataFilePath()): LocalRepository {
  return new LocalRepository(filePath);
}
