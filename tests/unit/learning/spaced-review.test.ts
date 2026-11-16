import { describe, expect, it } from "vitest";
import { computeNextReviewAt, passedStreak, reviewIntervalDays, scheduleReview } from "@/lib/learning/spaced-review";
import { NOW, iso, makeMastery, makeReview } from "./fixtures";

const SKILL = "markets.price";

describe("reviewIntervalDays", () => {
  it.each([
    [0, false, 1],
    [1, false, 3],
    [2, false, 7],
    [3, false, 14],
    [9, false, 14],
    [3, true, 1],
  ])("passed=%i lastFailed=%s → %i days", (passed, failed, days) => {
    expect(reviewIntervalDays(passed, failed)).toBe(days);
  });
});

describe("passedStreak", () => {
  it("counts consecutive passes and resets on failure", () => {
    const reviews = [
      makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(-10), completedAt: iso(-10), result: "passed" }),
      makeReview({ id: "r2", skillId: SKILL, scheduledAt: iso(-7), completedAt: iso(-7), result: "passed" }),
    ];
    expect(passedStreak(reviews, SKILL)).toEqual({ passed: 2, lastFailed: false });
    const failed = [...reviews, makeReview({ id: "r3", skillId: SKILL, scheduledAt: iso(-1), completedAt: iso(-1), result: "failed" })];
    expect(passedStreak(failed, SKILL)).toEqual({ passed: 0, lastFailed: true });
  });
});

describe("computeNextReviewAt", () => {
  it("is null while learning", () => {
    expect(computeNextReviewAt({ skillId: SKILL, masteryStatus: "learning", lastAssessedAt: iso(-1) }, [], NOW)).toBeNull();
  });
  it("grows 1d → 3d → 7d → 14d from the last assessment", () => {
    const rec = { skillId: SKILL, masteryStatus: "practising" as const, lastAssessedAt: iso(0) };
    const passed = (n: number) => Array.from({ length: n }, (_, i) => makeReview({ id: `r${i}`, skillId: SKILL, scheduledAt: iso(-20 + i), completedAt: iso(-20 + i), result: "passed" }));
    expect(computeNextReviewAt(rec, passed(0), NOW)).toBe(iso(1));
    expect(computeNextReviewAt(rec, passed(1), NOW)).toBe(iso(3));
    expect(computeNextReviewAt(rec, passed(2), NOW)).toBe(iso(7));
    expect(computeNextReviewAt(rec, passed(3), NOW)).toBe(iso(14));
  });
  it("resets to 1d after a failure", () => {
    const rec = { skillId: SKILL, masteryStatus: "practising" as const, lastAssessedAt: iso(0) };
    const reviews = [
      makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(-10), completedAt: iso(-10), result: "passed" }),
      makeReview({ id: "r2", skillId: SKILL, scheduledAt: iso(-7), completedAt: iso(-7), result: "passed" }),
      makeReview({ id: "r3", skillId: SKILL, scheduledAt: iso(-1), completedAt: iso(-1), result: "failed" }),
    ];
    expect(computeNextReviewAt(rec, reviews, NOW)).toBe(iso(1));
  });
});

describe("scheduleReview", () => {
  it("returns null below practising", () => {
    expect(scheduleReview(makeMastery({ skillId: SKILL, status: "learning" }), NOW)).toBeNull();
    expect(scheduleReview(makeMastery({ skillId: SKILL, status: "not-started" }), NOW)).toBeNull();
  });
  it("creates a pending review at nextReviewAt when practising", () => {
    const review = scheduleReview(makeMastery({ skillId: SKILL, status: "practising", nextReviewAt: iso(1) }), NOW);
    expect(review).not.toBeNull();
    expect(review?.skillId).toBe(SKILL);
    expect(review?.scheduledAt).toBe(iso(1));
    expect(review?.completedAt).toBeNull();
    expect(review?.result).toBeNull();
  });
  it("returns null when a review is already pending for the skill", () => {
    const pending = makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(1) });
    expect(scheduleReview(makeMastery({ skillId: SKILL, status: "practising", nextReviewAt: iso(1) }), NOW, [pending])).toBeNull();
  });
  it("derives the date from the streak when the record has no nextReviewAt", () => {
    const passed = makeReview({ id: "r1", skillId: SKILL, scheduledAt: iso(-3), completedAt: iso(-3), result: "passed" });
    const review = scheduleReview({ ...makeMastery({ skillId: SKILL, status: "practising" }), lastAssessedAt: iso(0), nextReviewAt: null }, NOW, [passed]);
    expect(review?.scheduledAt).toBe(iso(3));
  });
});
