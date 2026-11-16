import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalRepository, type LocalRepository } from "@/lib/db/local-repository";
import type { MasteryRecord, Profile, Review, Scenario, ScenarioAttempt } from "@/lib/types";

const now = "2026-11-06T10:00:00.000Z";

function profile(id: string): Profile {
  return {
    id,
    displayName: id,
    experienceLevel: "new",
    learningGoal: "read-market-data",
    preferredLearningStyle: "concise",
    interests: [],
    onboardingCompletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function scenario(id: string, templateId = "tpl-1", createdAt = now): Scenario {
  return {
    id,
    templateId,
    title: "t",
    description: "d",
    difficulty: 1,
    skillIds: ["markets.price"],
    learningObjective: "o",
    evidence: { id: `ev-${id}`, createdAt, snapshots: [], news: [], etfFlows: [], indexes: [], orderBooks: [] },
    questions: [{ id: "q1", prompt: "p" }],
    expectedReasoning: [],
    rubric: { dimensions: [], keyPoints: [], acceptableAlternatives: [], commonMisconceptionIds: [] },
    hints: ["a", "b", "c"],
    createdAt,
  };
}

function attempt(id: string, userId: string, scenarioId: string, createdAt = now): ScenarioAttempt {
  return {
    id,
    userId,
    scenarioId,
    skillIds: ["markets.price"],
    submittedAnswer: "an answer that is long enough",
    hintsUsed: 0,
    evaluation: {
      totalScore: 70,
      rubricScores: { factual: 30, evidence: 15, reasoning: 15, uncertainty: 10 },
      correctReasoning: [],
      missingEvidence: [],
      misconceptionIds: [],
      explanation: "",
      followUp: "",
      recommendedReviewSkillIds: [],
      confidence: 0.5,
      evaluatorMode: "rules",
      promptVersion: "rules-v1",
    },
    createdAt,
  };
}

function mastery(userId: string, skillId: string, score = 50): MasteryRecord {
  return {
    userId,
    skillId,
    masteryScore: score,
    masteryStatus: "learning",
    evidenceCount: 1,
    evidence: [],
    unresolvedMisconceptionIds: [],
    lastAssessedAt: now,
    nextReviewAt: null,
    updatedAt: now,
  };
}

function review(id: string, userId: string, completed = false): Review {
  return { id, userId, skillId: "markets.price", scheduledAt: now, completedAt: completed ? now : null, result: completed ? "passed" : null, attemptId: null };
}

describe("LocalRepository", () => {
  let dir: string;
  let file: string;
  let repo: LocalRepository;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "marketgym-repo-"));
    file = path.join(dir, "nested", "store.json");
    repo = createLocalRepository(file);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips a profile and persists it to disk atomically", async () => {
    await repo.upsertProfile(profile("u1"));
    const got = await repo.getProfile("u1");
    expect(got).toEqual(profile("u1"));
    const raw = JSON.parse(await readFile(file, "utf8")) as { profiles: Record<string, Profile> };
    expect(raw.profiles.u1?.displayName).toBe("u1");
    // a fresh instance on the same file sees the data
    const again = createLocalRepository(file);
    expect(await again.getProfile("u1")).toEqual(profile("u1"));
  });

  it("isolates every user-scoped collection between two user ids", async () => {
    await repo.saveScenario(scenario("s1"));
    await repo.saveAttempt(attempt("a1", "alice", "s1"));
    await repo.saveAttempt(attempt("a2", "bob", "s1"));
    await repo.upsertMastery(mastery("alice", "markets.price", 80));
    await repo.saveReview(review("r1", "alice"));
    await repo.logActivity({ id: "ev1", userId: "alice", kind: "scenario", skillIds: [], summary: "x", createdAt: now });
    await repo.saveKnowledgeCheckResult({ id: "k1", userId: "alice", skillId: "markets.price", knowledgeCheckId: "kc", optionId: "o", correct: true, misconceptionId: null, reviewId: null, createdAt: now });
    await repo.saveCoachSession({ id: "c1", userId: "alice", skillId: "markets.price", moduleId: "markets", objective: "", messages: [], hintsRevealed: 0, mode: "offline", status: "active", createdAt: now, updatedAt: now });
    await repo.saveDiagnostic({ id: "d1", userId: "alice", estimates: [], recommendedStartSkillId: "markets.price", recommendedStartModuleId: "markets", summary: "", createdAt: now });

    expect((await repo.listAttempts("bob")).map((a) => a.id)).toEqual(["a2"]);
    expect((await repo.listAttempts("alice")).map((a) => a.id)).toEqual(["a1"]);
    expect(await repo.listMastery("bob")).toEqual([]);
    expect(await repo.getMastery("bob", "markets.price")).toBeNull();
    expect(await repo.listReviews("bob")).toEqual([]);
    expect(await repo.getReview("bob", "r1")).toBeNull();
    expect(await repo.listActivity("bob", 10)).toEqual([]);
    expect(await repo.listKnowledgeCheckResults("bob")).toEqual([]);
    expect(await repo.getCoachSession("bob", "c1")).toBeNull();
    expect(await repo.listCoachSessions("bob", 10)).toEqual([]);
    expect(await repo.getLatestDiagnostic("bob")).toBeNull();
    expect(await repo.getProfile("bob")).toBeNull();
    // scenarios are shared (global) by contract
    expect((await repo.getScenario("s1"))?.id).toBe("s1");
  });

  it("orders attempts newest first, filters by scenario and honours limit", async () => {
    await repo.saveAttempt(attempt("old", "u", "s1", "2026-11-01T00:00:00.000Z"));
    await repo.saveAttempt(attempt("new", "u", "s1", "2026-11-05T00:00:00.000Z"));
    await repo.saveAttempt(attempt("other", "u", "s2", "2026-11-06T00:00:00.000Z"));
    expect((await repo.listAttempts("u")).map((a) => a.id)).toEqual(["other", "new", "old"]);
    expect((await repo.listAttempts("u", { scenarioId: "s1" })).map((a) => a.id)).toEqual(["new", "old"]);
    expect((await repo.listAttempts("u", { limit: 1 })).map((a) => a.id)).toEqual(["other"]);
  });

  it("upserts mastery per (user, skill) and lists reviews by pending state", async () => {
    await repo.upsertMastery(mastery("u", "markets.price", 10));
    await repo.upsertMastery(mastery("u", "markets.price", 90));
    await repo.upsertMastery(mastery("u", "markets.volume", 20));
    const list = await repo.listMastery("u");
    expect(list).toHaveLength(2);
    expect(list.find((m) => m.skillId === "markets.price")?.masteryScore).toBe(90);

    await repo.saveReview(review("r-pending", "u"));
    await repo.saveReview(review("r-done", "u", true));
    expect((await repo.listReviews("u", { pending: true })).map((r) => r.id)).toEqual(["r-pending"]);
    expect((await repo.listReviews("u", { pending: false })).map((r) => r.id)).toEqual(["r-done"]);
    expect(await repo.listReviews("u")).toHaveLength(2);
  });

  it("lists scenarios by template newest first with a limit", async () => {
    await repo.saveScenario(scenario("s-old", "tpl", "2026-11-01T00:00:00.000Z"));
    await repo.saveScenario(scenario("s-new", "tpl", "2026-11-06T00:00:00.000Z"));
    await repo.saveScenario(scenario("s-x", "other", "2026-11-07T00:00:00.000Z"));
    expect((await repo.listScenariosByTemplate("tpl", 1)).map((s) => s.id)).toEqual(["s-new"]);
    expect((await repo.listScenariosByTemplate("tpl", 10)).map((s) => s.id)).toEqual(["s-new", "s-old"]);
  });

  it("serialises concurrent writes without losing records", async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => repo.logActivity({ id: `e${i}`, userId: "u", kind: "lesson", skillIds: [], summary: `${i}`, createdAt: now })));
    expect(await repo.listActivity("u", 100)).toHaveLength(25);
    const raw = JSON.parse(await readFile(file, "utf8")) as { activity: unknown[] };
    expect(raw.activity).toHaveLength(25);
  });

  it("returns copies, so callers cannot mutate stored state", async () => {
    await repo.upsertProfile(profile("u1"));
    const p = await repo.getProfile("u1");
    p!.displayName = "mutated";
    expect((await repo.getProfile("u1"))?.displayName).toBe("u1");
  });
});
