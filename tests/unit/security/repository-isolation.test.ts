/**
 * (f) Repository isolation (acceptance test 10, local mode). Every Repository
 * method is scoped by userId: user A must never read or overwrite user B's
 * attempts, mastery, reviews, coach sessions, diagnostics, activity or
 * knowledge-check results. Supabase mode relies on RLS (docs/SECURITY.md).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import type { CoachSession, MasteryRecord, Review, ScenarioAttempt } from "@/lib/types";
import type { Repository } from "@/lib/db/repository";
import { fileExists } from "./_helpers";

const A = "user-a";
const B = "user-b";
const now = new Date("2026-11-06T10:00:00.000Z").toISOString();

const attempt = (user: string, id: string): ScenarioAttempt => ({
  id,
  userId: user,
  scenarioId: "scn-1",
  skillIds: ["markets.price"],
  submittedAnswer: `answer from ${user}`,
  hintsUsed: 0,
  evaluation: {
    totalScore: 70,
    rubricScores: { factual: 25, evidence: 15, reasoning: 20, uncertainty: 10 },
    correctReasoning: [],
    missingEvidence: [],
    misconceptionIds: [],
    explanation: "",
    followUp: "",
    recommendedReviewSkillIds: [],
    confidence: 0.8,
    evaluatorMode: "rules",
    promptVersion: "rules-v1",
  },
  createdAt: now,
});

const mastery = (user: string, score: number): MasteryRecord => ({
  userId: user,
  skillId: "markets.price",
  masteryScore: score,
  masteryStatus: "practising",
  evidenceCount: 1,
  evidence: [],
  unresolvedMisconceptionIds: [],
  lastAssessedAt: now,
  nextReviewAt: null,
  updatedAt: now,
});

const review = (user: string, id: string): Review => ({
  id,
  userId: user,
  skillId: "markets.price",
  scheduledAt: now,
  completedAt: null,
  result: null,
  attemptId: null,
});

const session = (user: string, id: string): CoachSession => ({
  id,
  userId: user,
  skillId: "markets.price",
  moduleId: "markets",
  objective: "o",
  messages: [{ id: "m1", role: "learner", content: `secret from ${user}`, createdAt: now }],
  hintsRevealed: 0,
  mode: "offline",
  status: "active",
  createdAt: now,
  updatedAt: now,
});

describe("local repository isolation", () => {
  const present = fileExists("lib/db/local-repository.ts");
  const tmpDir = path.join(os.tmpdir(), `marketgym-isolation-${process.pid}`);
  let repo: Repository;

  beforeAll(async () => {
    if (!present) return;
    await fs.mkdir(tmpDir, { recursive: true });
    const { createLocalRepository } = await import("@/lib/db/local-repository");
    repo = createLocalRepository(path.join(tmpDir, "data.json"));
    await repo.saveAttempt(attempt(A, "att-a"));
    await repo.saveAttempt(attempt(B, "att-b"));
    await repo.upsertMastery(mastery(A, 40));
    await repo.upsertMastery(mastery(B, 90));
    await repo.saveReview(review(A, "rev-a"));
    await repo.saveReview(review(B, "rev-b"));
    await repo.saveCoachSession(session(A, "ses-a"));
    await repo.saveCoachSession(session(B, "ses-b"));
    await repo.logActivity({ id: "act-a", userId: A, kind: "scenario", skillIds: [], summary: "a", createdAt: now });
    await repo.logActivity({ id: "act-b", userId: B, kind: "scenario", skillIds: [], summary: "b", createdAt: now });
    await repo.saveKnowledgeCheckResult({ id: "kc-a", userId: A, skillId: "markets.price", knowledgeCheckId: "k", optionId: "o", correct: true, misconceptionId: null, reviewId: null, createdAt: now });
    await repo.saveKnowledgeCheckResult({ id: "kc-b", userId: B, skillId: "markets.price", knowledgeCheckId: "k", optionId: "o", correct: false, misconceptionId: "price-equals-value", reviewId: null, createdAt: now });
    await repo.saveDiagnostic({ id: "diag-a", userId: A, estimates: [], recommendedStartSkillId: "markets.price", recommendedStartModuleId: "markets", summary: "a", createdAt: now });
    await repo.saveDiagnostic({ id: "diag-b", userId: B, estimates: [], recommendedStartSkillId: "news.catalysts", recommendedStartModuleId: "news", summary: "b", createdAt: "2026-11-06T11:00:00.000Z" });
  });
  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const run = present ? it : it.skip;

  run("A cannot list B's attempts", async () => {
    const a = await repo.listAttempts(A);
    expect(a.map((x) => x.id)).toEqual(["att-a"]);
    expect(a.every((x) => x.userId === A)).toBe(true);
    const aByScenario = await repo.listAttempts(A, { scenarioId: "scn-1" });
    expect(aByScenario.map((x) => x.id)).toEqual(["att-a"]);
  });

  run("A cannot read B's mastery", async () => {
    expect((await repo.listMastery(A)).map((m) => m.masteryScore)).toEqual([40]);
    expect((await repo.getMastery(A, "markets.price"))?.masteryScore).toBe(40);
    expect(await repo.getMastery("user-c", "markets.price")).toBeNull();
  });

  run("A's mastery write cannot clobber B's row", async () => {
    await repo.upsertMastery(mastery(A, 55));
    expect((await repo.getMastery(B, "markets.price"))?.masteryScore).toBe(90);
    expect((await repo.getMastery(A, "markets.price"))?.masteryScore).toBe(55);
  });

  run("A cannot read B's reviews or coach sessions by id", async () => {
    expect(await repo.getReview(A, "rev-b")).toBeNull();
    expect((await repo.listReviews(A)).map((r) => r.id)).toEqual(["rev-a"]);
    expect(await repo.getCoachSession(A, "ses-b")).toBeNull();
    expect((await repo.listCoachSessions(A, 10)).map((s) => s.id)).toEqual(["ses-a"]);
    expect((await repo.listCoachSessions(A, 10))[0]!.messages[0]!.content).not.toContain("user-b");
  });

  run("activity, knowledge-check results and diagnostics are per user", async () => {
    expect((await repo.listActivity(A, 10)).map((e) => e.id)).toEqual(["act-a"]);
    expect((await repo.listKnowledgeCheckResults(A)).map((k) => k.id)).toEqual(["kc-a"]);
    expect((await repo.listKnowledgeCheckResults(A, "markets.price")).map((k) => k.id)).toEqual(["kc-a"]);
    expect((await repo.getLatestDiagnostic(A))?.id).toBe("diag-a"); // B's newer diagnostic must not leak
    expect(await repo.getLatestDiagnostic("user-c")).toBeNull();
    expect(await repo.getProfile(B)).toBeNull();
  });

  run("returned objects are copies: mutating a result does not alter the store", async () => {
    const a = (await repo.listAttempts(A))[0]!;
    a.submittedAnswer = "tampered";
    expect((await repo.listAttempts(A))[0]!.submittedAnswer).toBe("answer from user-a");
  });
});
