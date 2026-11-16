import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, body, get, noParams, okData, post, setupLocalEnv, withId } from "./helpers";
import { curriculum } from "@/lib/curriculum";
import type {
  DiagnosticQuestion,
  DiagnosticSubmitResponse,
  KnowledgeCheckSubmitResponse,
  LearningPathResponse,
  OrderBookExercise,
  OrderBookExerciseSubmitResponse,
  ProfileResponse,
  ProgressAttemptsResponse,
  ProgressOverviewResponse,
  ProgressSkillsResponse,
  ScenarioAttemptResponse,
  ScenarioGetResponse,
  ScenarioNextResponse,
  ScenarioResultResponse,
} from "@/lib/types";

let cleanup: () => Promise<void>;

beforeAll(async () => {
  ({ cleanup } = await setupLocalEnv());
});
afterAll(async () => cleanup());

const SKILL = "markets.price";

describe("auth boundary", () => {
  it("returns 401 with the ApiErr envelope when there is no learner", async () => {
    asUser(null);
    const { GET } = await import("@/app/api/profile/route");
    const res = await GET(get("/api/profile"), noParams);
    expect(res.status).toBe(401);
    const err = await body(res);
    expect(err).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    asUser({ id: "local-demo-user", email: null });
  });
});

describe("profile + diagnostic", () => {
  it("creates the local learner on first visit and validates PUT bodies", async () => {
    const { GET, PUT } = await import("@/app/api/profile/route");
    const created = await okData<ProfileResponse>(await GET(get("/api/profile"), noParams));
    expect(created.id).toBe("local-demo-user");
    expect(created.onboardingCompletedAt).toBeNull();

    const bad = await PUT(post("/api/profile", { displayName: "" }, "PUT"), noParams);
    expect(bad.status).toBe(400);
    const malformed = await PUT(post("/api/profile", "{not json", "PUT"), noParams);
    expect(malformed.status).toBe(400);

    const updated = await okData<ProfileResponse>(
      await PUT(post("/api/profile", { displayName: "Ada", experienceLevel: "some", learningGoal: "understand-news", preferredLearningStyle: "examples", interests: ["news"] }, "PUT"), noParams),
    );
    expect(updated.displayName).toBe("Ada");
    expect(updated.learningGoal).toBe("understand-news");
  });

  it("runs the diagnostic, marks onboarding complete and returns a next mission", async () => {
    const questions = await okData<DiagnosticQuestion[]>(await (await import("@/app/api/diagnostic/questions/route")).GET(get("/api/diagnostic/questions"), noParams));
    expect(questions.length).toBeGreaterThanOrEqual(6);
    const answers = questions.map((q) => ({ questionId: q.id, value: q.kind === "choice" ? q.options![0]!.id : "Volume shows how much traded; it does not tell direction on its own." }));
    const { POST } = await import("@/app/api/diagnostic/route");
    expect((await POST(post("/api/diagnostic", { answers: [] }), noParams)).status).toBe(400);
    const result = await okData<DiagnosticSubmitResponse>(await POST(post("/api/diagnostic", { answers }), noParams));
    expect(result.userId).toBe("local-demo-user");
    expect(result.estimates.length).toBeGreaterThan(0);
    expect(result.nextMission.kind).not.toBe("diagnostic");
    const profile = await okData<ProfileResponse>(await (await import("@/app/api/profile/route")).GET(get("/api/profile"), noParams));
    expect(profile.onboardingCompletedAt).not.toBeNull();
  });
});

describe("scenario attempt flow", () => {
  let scenarioId = "";

  it("GET /api/scenarios/next builds a scenario with frozen evidence and reuses it within 30 min", async () => {
    const { GET } = await import("@/app/api/scenarios/next/route");
    expect((await GET(get("/api/scenarios/next"), noParams)).status).toBe(400);
    expect((await GET(get("/api/scenarios/next?skillId=nope.skill"), noParams)).status).toBe(404);
    const first = await okData<ScenarioNextResponse>(await GET(get(`/api/scenarios/next?skillId=${SKILL}`), noParams));
    expect(first.skillIds).toContain(SKILL);
    expect(first.evidence.snapshots.length).toBeGreaterThan(0);
    expect(first.evidence.snapshots.every((s) => s.provenance.kind === "demo")).toBe(true);
    const second = await okData<ScenarioNextResponse>(await GET(get(`/api/scenarios/next?skillId=${SKILL}`), noParams));
    expect(second.id).toBe(first.id);
    scenarioId = first.id;
  });

  it("rejects answers shorter than 20 or longer than 4000 chars", async () => {
    const { POST } = await import("@/app/api/scenarios/[id]/attempt/route");
    expect((await POST(post(`/api/scenarios/${scenarioId}/attempt`, { answer: "too short", hintsUsed: 0 }), withId(scenarioId))).status).toBe(400);
    expect((await POST(post(`/api/scenarios/${scenarioId}/attempt`, { answer: "x".repeat(4001), hintsUsed: 0 }), withId(scenarioId))).status).toBe(400);
    expect((await POST(post(`/api/scenarios/${scenarioId}/attempt`, { answer: "x".repeat(50), hintsUsed: 9 }), withId(scenarioId))).status).toBe(400);
    expect((await POST(post(`/api/scenarios/missing/attempt`, { answer: "x".repeat(50), hintsUsed: 0 }), withId("missing"))).status).toBe(404);
  });

  it("evaluates, stores the attempt, recomputes mastery from stored records and logs activity", async () => {
    const { POST } = await import("@/app/api/scenarios/[id]/attempt/route");
    const answer =
      "Looking at the BTC snapshot, the price is around 75,500 and it fell about 6% over 24 hours. I observe the move but I cannot infer the cause from price alone; volume would help confirm conviction. My interpretation is tentative and I would want more evidence, such as news or order flow, before drawing a conclusion. I would be wrong if the move reversed on higher volume.";
    const res = await POST(post(`/api/scenarios/${scenarioId}/attempt`, { answer, hintsUsed: 1 }), withId(scenarioId));
    expect(res.status).toBe(200);
    const data = await okData<ScenarioAttemptResponse>(res);
    expect(data.attempt.scenarioId).toBe(scenarioId);
    expect(data.attempt.userId).toBe("local-demo-user");
    expect(data.evaluation.evaluatorMode).toBe("rules");
    expect(data.evaluation.totalScore).toBeGreaterThanOrEqual(0);
    expect(data.masteryUpdates.map((m) => m.skillId)).toEqual(expect.arrayContaining([SKILL]));
    const m = data.masteryUpdates.find((u) => u.skillId === SKILL)!;
    expect(m.evidenceCount).toBeGreaterThanOrEqual(1);
    expect(m.masteryStatus).not.toBe("not-started");
    expect(data.nextMission.href).toMatch(/^\//);

    const skills = await okData<ProgressSkillsResponse>(await (await import("@/app/api/progress/skills/route")).GET(get("/api/progress/skills"), noParams));
    expect(skills.find((s) => s.skill.id === SKILL)?.mastery?.evidenceCount).toBe(m.evidenceCount);

    const got = await okData<ScenarioGetResponse>(await (await import("@/app/api/scenarios/[id]/route")).GET(get(`/api/scenarios/${scenarioId}`), withId(scenarioId)));
    expect(got.latestAttempt?.id).toBe(data.attempt.id);

    const results = await okData<ScenarioResultResponse>(await (await import("@/app/api/scenarios/[id]/result/route")).GET(get(`/api/scenarios/${scenarioId}/result`), withId(scenarioId)));
    expect(results.map((a) => a.id)).toEqual([data.attempt.id]);

    const overview = await okData<ProgressOverviewResponse>(await (await import("@/app/api/progress/overview/route")).GET(get("/api/progress/overview"), noParams));
    expect(overview.streakDays).toBe(1);
    expect(overview.weekly.attempts).toBe(1);
    expect(overview.weekly.averageScore).toBe(Math.round(data.evaluation.totalScore));
    expect(overview.recentActivity.some((e) => e.kind === "scenario" && e.refId === scenarioId)).toBe(true);
    expect(overview.totalSkills).toBe(curriculum.skills.length);

    const path = await okData<LearningPathResponse>(await (await import("@/app/api/learning/path/route")).GET(get("/api/learning/path"), noParams));
    expect(path.modules.length).toBe(curriculum.modules.length);

    // the attempt records its template, and an answered scenario is never handed back as "next"
    expect(data.attempt.templateId).toBe(got.templateId);
    const { GET: nextGET } = await import("@/app/api/scenarios/next/route");
    const fresh = await okData<ScenarioNextResponse>(await nextGET(get(`/api/scenarios/next?skillId=${SKILL}`), noParams));
    expect(fresh.id).not.toBe(scenarioId);
  });

  it("user B cannot read user A's attempt", async () => {
    asUser({ id: "user-b", email: "b@example.com" });
    const results = await okData<ScenarioResultResponse>(await (await import("@/app/api/scenarios/[id]/result/route")).GET(get(`/api/scenarios/${scenarioId}/result`), withId(scenarioId)));
    expect(results).toEqual([]);
    const attempts = await okData<ProgressAttemptsResponse>(await (await import("@/app/api/progress/attempts/route")).GET(get("/api/progress/attempts"), noParams));
    expect(attempts).toEqual([]);
    const got = await okData<ScenarioGetResponse>(await (await import("@/app/api/scenarios/[id]/route")).GET(get(`/api/scenarios/${scenarioId}`), withId(scenarioId)));
    expect(got.latestAttempt).toBeNull();
    const skills = await okData<ProgressSkillsResponse>(await (await import("@/app/api/progress/skills/route")).GET(get("/api/progress/skills"), noParams));
    expect(skills.every((s) => s.mastery === null)).toBe(true);
    asUser({ id: "local-demo-user", email: null });
  });
});

describe("knowledge checks and the order book gym", () => {
  it("grades a knowledge check against the curriculum and recomputes mastery", async () => {
    const check = curriculum.modules.flatMap((m) => m.knowledgeChecks)[0]!;
    const correct = check.options.find((o) => o.correct)!;
    const wrong = check.options.find((o) => !o.correct)!;
    const { POST } = await import("@/app/api/learning/knowledge-check/route");
    expect((await POST(post("/api/learning/knowledge-check", { knowledgeCheckId: "kc.nope", optionId: "a" }), noParams)).status).toBe(404);
    expect((await POST(post("/api/learning/knowledge-check", { knowledgeCheckId: check.id, optionId: "zzz" }), noParams)).status).toBe(400);
    const res = await okData<KnowledgeCheckSubmitResponse>(await POST(post("/api/learning/knowledge-check", { knowledgeCheckId: check.id, optionId: correct.id }), noParams));
    expect(res.correct).toBe(true);
    expect(res.check.id).toBe(check.id);
    const miss = await okData<KnowledgeCheckSubmitResponse>(await POST(post("/api/learning/knowledge-check", { knowledgeCheckId: check.id, optionId: wrong.id }), noParams));
    expect(miss.correct).toBe(false);
    if (wrong.misconceptionId) expect(miss.misconceptionId).toBe(wrong.misconceptionId);
    const skills = await okData<ProgressSkillsResponse>(await (await import("@/app/api/progress/skills/route")).GET(get("/api/progress/skills"), noParams));
    expect(skills.find((s) => s.skill.id === check.skillId)?.mastery?.evidenceCount).toBeGreaterThanOrEqual(2);
  });

  it("grades an order book exercise against the current book and stores per-question records", async () => {
    const exercises = await okData<OrderBookExercise[]>(await (await import("@/app/api/orderbook-gym/exercises/route")).GET(get("/api/orderbook-gym/exercises"), noParams));
    const ex = exercises.find((e) => e.id === "ob-identify-spread") ?? exercises[0]!;
    const { POST } = await import("@/app/api/orderbook-gym/submit/route");
    const market = ex.markets[0]!;
    const payload = {
      exerciseId: ex.id,
      market,
      answers: { "best-bid": 75576, "best-ask": 75577, spread: 1, "spread-meaning": "round-trip" },
      snapshotTimestamp: "2026-11-06T05:42:25.796Z",
    };
    const res = await okData<OrderBookExerciseSubmitResponse>(await POST(post("/api/orderbook-gym/submit", payload), noParams));
    expect(res.results).toHaveLength(ex.questions.length);
    expect(res.score).toBe(100);
    expect(res.masteryUpdates.map((m) => m.skillId)).toEqual(expect.arrayContaining(ex.skillIds));

    const moved = await okData<OrderBookExerciseSubmitResponse>(await POST(post("/api/orderbook-gym/submit", { ...payload, snapshotTimestamp: "2026-01-01T00:00:00.000Z" }), noParams));
    expect(moved.results[0]!.explanation).toMatch(/book moved/);

    expect((await POST(post("/api/orderbook-gym/submit", { ...payload, exerciseId: "nope" }), noParams)).status).toBe(404);
    expect((await POST(post("/api/orderbook-gym/submit", { ...payload, answers: {} }), noParams)).status).toBe(400);

    const overview = await okData<ProgressOverviewResponse>(await (await import("@/app/api/progress/overview/route")).GET(get("/api/progress/overview"), noParams));
    expect(overview.recentActivity.some((e) => e.kind === "orderbook")).toBe(true);
  });
});

describe("auth routes in local mode", () => {
  it("sign-up / log-in return ok and point at onboarding; log-out points home", async () => {
    const signup = await okData<{ mode: string; redirectTo: string }>(await (await import("@/app/api/auth/signup/route")).POST(post("/api/auth/signup", { email: "a@b.co", password: "password123" }), noParams));
    expect(signup).toEqual({ mode: "local", redirectTo: "/app/onboarding" });
    const login = await okData<{ redirectTo: string }>(await (await import("@/app/api/auth/login/route")).POST(post("/api/auth/login", {}), noParams));
    expect(login.redirectTo).toBe("/app/onboarding");
    const logout = await okData<{ redirectTo: string }>(await (await import("@/app/api/auth/logout/route")).POST(post("/api/auth/logout", {}), noParams));
    expect(logout.redirectTo).toBe("/");
    // form posts get a 303 redirect
    const form = new Request("http://localhost:3001/api/auth/login", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "email=a%40b.co&password=password123" });
    const res = await (await import("@/app/api/auth/login/route")).POST(form, noParams);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/\/app\/onboarding$/);
  });
});
