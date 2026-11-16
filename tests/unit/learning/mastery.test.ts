import { describe, expect, it } from "vitest";
import { computeMastery, unresolvedCriticalMisconceptions } from "@/lib/learning/mastery";
import { NOW, iso, makeAttempt, makeKc, makeReview } from "./fixtures";

const SKILL = "orderbook.spread";
const base = { userId: "user-1", skillId: SKILL, now: NOW, previous: null };

const a = (id: string, scenarioId: string, score: number, day: number, misconceptionIds: string[] = []) =>
  makeAttempt({ id, scenarioId, skillIds: [SKILL], score, createdAt: iso(day), misconceptionIds });

describe("computeMastery — status table", () => {
  const cases: Array<{
    name: string;
    attempts?: ReturnType<typeof a>[];
    kcs?: ReturnType<typeof makeKc>[];
    reviews?: ReturnType<typeof makeReview>[];
    expected: "not-started" | "learning" | "practising" | "mastered";
  }> = [
    { name: "no records → not-started", expected: "not-started" },
    { name: "lesson opened (one correct check) ≠ mastery, only learning", kcs: [makeKc({ id: "k1", skillId: SKILL, correct: true, createdAt: iso(-5) })], expected: "learning" },
    { name: "two correct checks → practising", kcs: [makeKc({ id: "k1", skillId: SKILL, correct: true, createdAt: iso(-5) }), makeKc({ id: "k2", skillId: SKILL, correct: true, createdAt: iso(-4) })], expected: "practising" },
    { name: "one attempt ≥60 → practising", attempts: [a("a1", "s1", 65, -5)], expected: "practising" },
    { name: "one attempt <60 → learning", attempts: [a("a1", "s1", 40, -5)], expected: "learning" },
    {
      name: "two 80s on the SAME scenario don't count, even with a passed review",
      attempts: [a("a1", "s1", 85, -6), a("a2", "s1", 90, -5)],
      reviews: [makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(-3), completedAt: iso(-3), result: "passed" })],
      expected: "practising",
    },
    {
      name: "two 80s on different scenarios + review scheduled ≥1d after the second → mastered",
      attempts: [a("a1", "s1", 85, -6), a("a2", "s2", 82, -5)],
      reviews: [makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(-4), completedAt: iso(-3), result: "passed" })],
      expected: "mastered",
    },
    {
      name: "review scheduled less than 1 day after the second qualifying attempt does not count",
      attempts: [a("a1", "s1", 85, -6), a("a2", "s2", 82, -5)],
      reviews: [makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(-5, 6), completedAt: iso(-4), result: "passed" })],
      expected: "practising",
    },
    {
      name: "failed review does not unlock mastery",
      attempts: [a("a1", "s1", 85, -6), a("a2", "s2", 82, -5)],
      reviews: [makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(-4), completedAt: iso(-3), result: "failed" })],
      expected: "practising",
    },
    {
      name: "critical misconception in the latest attempt blocks mastery",
      attempts: [a("a1", "s1", 85, -6), a("a2", "s2", 82, -5, ["spread-is-fee"])],
      reviews: [makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(-4), completedAt: iso(-3), result: "passed" })],
      expected: "practising",
    },
    {
      name: "critical misconception followed by a clean attempt is resolved",
      attempts: [a("a1", "s1", 85, -7, ["spread-is-fee"]), a("a2", "s2", 82, -6), a("a3", "s1", 88, -5)],
      reviews: [makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(-4), completedAt: iso(-3), result: "passed" })],
      expected: "mastered",
    },
    {
      name: "non-critical misconception does not block",
      attempts: [a("a1", "s1", 85, -6), a("a2", "s2", 82, -5, ["volume-implies-direction"])],
      reviews: [makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(-4), completedAt: iso(-3), result: "passed" })],
      expected: "mastered",
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const record = computeMastery({ ...base, attempts: c.attempts ?? [], kcResults: c.kcs ?? [], reviews: c.reviews ?? [] });
      expect(record.masteryStatus).toBe(c.expected);
    });
  }
});

describe("computeMastery — score, evidence, misconceptions, review date", () => {
  it("weights best-two scenarios 60 %, checks 25 %, reviews 15 %", () => {
    const record = computeMastery({
      ...base,
      attempts: [a("a1", "s1", 90, -6), a("a2", "s2", 80, -5), a("a3", "s3", 40, -4)],
      kcResults: [makeKc({ id: "k1", skillId: SKILL, correct: true, createdAt: iso(-5) }), makeKc({ id: "k2", skillId: SKILL, correct: true, createdAt: iso(-4) })],
      reviews: [makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(-3), completedAt: iso(-3), result: "passed", attemptId: "k3" })],
    });
    expect(record.masteryScore).toBe(Math.round(0.6 * 85 + 0.25 * 100 + 0.15 * 100));
    // chronological: a1(-6) a2(-5) k1(-5) a3(-4) k2(-4) r1(-3); ties keep scenario → check order
    expect(record.evidence.map((e) => e.kind)).toEqual(["scenario", "scenario", "knowledge-check", "scenario", "knowledge-check", "retention-check"]);
    expect(record.evidenceCount).toBe(6);
    expect(record.lastAssessedAt).toBe(iso(-3));
  });

  it("ignores records for other skills", () => {
    const record = computeMastery({ ...base, attempts: [makeAttempt({ id: "x", scenarioId: "s9", skillIds: ["markets.price"], score: 95, createdAt: iso(-1) })], kcResults: [], reviews: [] });
    expect(record.masteryStatus).toBe("not-started");
    expect(record.masteryScore).toBe(0);
  });

  it("lists unresolved critical misconceptions from the last three attempts only", () => {
    const attempts = [a("a1", "s1", 50, -9, ["spread-is-fee"]), a("a2", "s2", 50, -8), a("a3", "s3", 50, -7), a("a4", "s4", 50, -6), a("a5", "s5", 55, -5, ["imbalance-predicts-price"])];
    expect(unresolvedCriticalMisconceptions(attempts)).toEqual(["imbalance-predicts-price"]);
    const record = computeMastery({ ...base, attempts, kcResults: [], reviews: [] });
    expect(record.unresolvedMisconceptionIds).toEqual(["imbalance-predicts-price"]);
  });

  it("sets nextReviewAt only from practising, 1 day after the last assessment", () => {
    const learning = computeMastery({ ...base, attempts: [a("a1", "s1", 40, -2)], kcResults: [], reviews: [] });
    expect(learning.nextReviewAt).toBeNull();
    const practising = computeMastery({ ...base, attempts: [a("a1", "s1", 70, -2)], kcResults: [], reviews: [] });
    expect(practising.nextReviewAt).toBe(iso(-1));
  });

  it("keeps a pending review's date as nextReviewAt", () => {
    const record = computeMastery({ ...base, attempts: [a("a1", "s1", 70, -2)], kcResults: [], reviews: [makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(2) })] });
    expect(record.nextReviewAt).toBe(iso(2));
  });
});
