/**
 * Shared Repository contract suite. Any implementation (local JSON, Postgres,
 * Supabase) must pass it; here it runs against LocalRepository because unit
 * tests never connect to a database. Ids are uuids so the same fixtures are
 * valid for the uuid-typed Postgres columns.
 */
import { describe, expect, it } from "vitest";
import type { Repository } from "@/lib/db/repository";
import type { MasteryRecord, PaperPortfolio, Profile, Review, Scenario, ScenarioAttempt } from "@/lib/types";

const now = "2026-11-27T10:00:00.000Z";
export const uuid = (n: number): string => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

export const ALICE = uuid(0xa11ce);
export const BOB = uuid(0xb0b);

export function profile(id: string): Profile {
  return {
    id,
    displayName: "Learner",
    experienceLevel: "new",
    learningGoal: "read-market-data",
    preferredLearningStyle: "concise",
    interests: ["markets"],
    onboardingCompletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function scenario(id: string, templateId = "tpl-1", createdAt = now): Scenario {
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

export function attempt(id: string, userId: string, scenarioId: string, createdAt = now): ScenarioAttempt {
  return {
    id,
    userId,
    scenarioId,
    templateId: "tpl-1",
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

export function mastery(userId: string, skillId: string, score = 50): MasteryRecord {
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

export function review(id: string, userId: string, completed = false): Review {
  return { id, userId, skillId: "markets.price", scheduledAt: now, completedAt: completed ? now : null, result: completed ? "passed" : null, attemptId: null };
}

export function portfolio(id: string, userId: string, updatedAt = now): PaperPortfolio {
  return {
    id,
    userId,
    name: `Portfolio ${id.slice(-4)}`,
    holdings: [
      { fundId: "vQQQ", weightPct: 60 },
      { fundId: "antb", weightPct: 40 },
    ],
    strategy: "weekly-dca",
    rationale: "A broad equity tracker plus a crypto index, sized so neither dominates the outcome.",
    createdAt: now,
    updatedAt,
  };
}

/** Runs the contract against a fresh repository per test. */
export function runRepositoryContract(name: string, makeRepo: () => Promise<{ repo: Repository; cleanup: () => Promise<void> }>): void {
  describe(`Repository contract: ${name}`, () => {
    async function withRepo(fn: (repo: Repository) => Promise<void>): Promise<void> {
      const { repo, cleanup } = await makeRepo();
      try {
        await fn(repo);
      } finally {
        await cleanup();
      }
    }

    it("round-trips a profile and upserts in place", () =>
      withRepo(async (repo) => {
        await repo.upsertProfile(profile(ALICE));
        expect(await repo.getProfile(ALICE)).toEqual(profile(ALICE));
        await repo.upsertProfile({ ...profile(ALICE), displayName: "Ada" });
        expect((await repo.getProfile(ALICE))?.displayName).toBe("Ada");
        expect(await repo.getProfile(BOB)).toBeNull();
      }));

    it("stores attempts newest first, filters by scenario and honours limit", () =>
      withRepo(async (repo) => {
        await repo.saveScenario(scenario(uuid(1)));
        await repo.saveScenario(scenario(uuid(2)));
        await repo.saveAttempt(attempt(uuid(11), ALICE, uuid(1), "2026-11-01T00:00:00.000Z"));
        await repo.saveAttempt(attempt(uuid(12), ALICE, uuid(1), "2026-11-05T00:00:00.000Z"));
        await repo.saveAttempt(attempt(uuid(13), ALICE, uuid(2), "2026-11-06T00:00:00.000Z"));
        expect((await repo.listAttempts(ALICE)).map((a) => a.id)).toEqual([uuid(13), uuid(12), uuid(11)]);
        expect((await repo.listAttempts(ALICE, { scenarioId: uuid(1) })).map((a) => a.id)).toEqual([uuid(12), uuid(11)]);
        expect((await repo.listAttempts(ALICE, { limit: 1 })).map((a) => a.id)).toEqual([uuid(13)]);
        expect((await repo.listAttempts(ALICE))[0]?.templateId).toBe("tpl-1");
      }));

    it("upserts mastery per (user, skill) and filters reviews by pending state", () =>
      withRepo(async (repo) => {
        await repo.upsertMastery(mastery(ALICE, "markets.price", 10));
        await repo.upsertMastery(mastery(ALICE, "markets.price", 90));
        await repo.upsertMastery(mastery(ALICE, "markets.volume", 20));
        expect(await repo.listMastery(ALICE)).toHaveLength(2);
        expect((await repo.getMastery(ALICE, "markets.price"))?.masteryScore).toBe(90);
        await repo.saveReview(review(uuid(21), ALICE));
        await repo.saveReview(review(uuid(22), ALICE, true));
        expect((await repo.listReviews(ALICE, { pending: true })).map((r) => r.id)).toEqual([uuid(21)]);
        expect((await repo.listReviews(ALICE, { pending: false })).map((r) => r.id)).toEqual([uuid(22)]);
      }));

    it("saves, updates, reads and lists practice portfolios newest first", () =>
      withRepo(async (repo) => {
        await repo.savePortfolio(portfolio(uuid(31), ALICE, "2026-11-20T00:00:00.000Z"));
        await repo.savePortfolio(portfolio(uuid(32), ALICE, "2026-11-25T00:00:00.000Z"));
        expect((await repo.listPortfolios(ALICE)).map((p) => p.id)).toEqual([uuid(32), uuid(31)]);
        const updated = { ...portfolio(uuid(31), ALICE, "2026-11-26T00:00:00.000Z"), name: "Renamed" };
        await repo.savePortfolio(updated);
        expect(await repo.getPortfolio(ALICE, uuid(31))).toEqual(updated);
        expect((await repo.listPortfolios(ALICE)).map((p) => p.id)).toEqual([uuid(31), uuid(32)]);
      }));

    it("isolates every user-scoped collection, portfolios included", () =>
      withRepo(async (repo) => {
        await repo.saveScenario(scenario(uuid(1)));
        await repo.saveAttempt(attempt(uuid(11), ALICE, uuid(1)));
        await repo.upsertMastery(mastery(ALICE, "markets.price", 80));
        await repo.saveReview(review(uuid(21), ALICE));
        await repo.savePortfolio(portfolio(uuid(31), ALICE));
        await repo.logActivity({ id: uuid(41), userId: ALICE, kind: "portfolio", skillIds: [], summary: "x", createdAt: now });
        expect(await repo.listAttempts(BOB)).toEqual([]);
        expect(await repo.getMastery(BOB, "markets.price")).toBeNull();
        expect(await repo.getReview(BOB, uuid(21))).toBeNull();
        expect(await repo.getPortfolio(BOB, uuid(31))).toBeNull();
        expect(await repo.listPortfolios(BOB)).toEqual([]);
        expect(await repo.listActivity(BOB, 10)).toEqual([]);
        expect((await repo.listActivity(ALICE, 10))[0]?.kind).toBe("portfolio");
        // scenarios are shared rows by contract
        expect((await repo.getScenario(uuid(1)))?.id).toBe(uuid(1));
      }));

    it("refuses to let one user overwrite another user's portfolio by id", () =>
      withRepo(async (repo) => {
        await repo.savePortfolio(portfolio(uuid(31), ALICE));
        await expect(repo.savePortfolio({ ...portfolio(uuid(31), BOB), name: "hijack" })).rejects.toThrow();
        expect((await repo.getPortfolio(ALICE, uuid(31)))?.name).not.toBe("hijack");
        expect(await repo.getPortfolio(BOB, uuid(31))).toBeNull();
      }));
  });
}
