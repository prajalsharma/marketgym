/**
 * (b) Input validation. Malformed bodies for attempt / profile / diagnostic
 * are rejected with 400 + { ok:false, error.code:"validation_error" }.
 * Two layers: the Zod schemas in lib/server/validation.ts (always runnable)
 * and the real route handlers in local mode (skipped until they land).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import { type RouteModule, callRoute, fileExists, loadOrSkip, stubLocalEnv } from "./_helpers";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], get: () => undefined, set: () => undefined }),
  headers: async () => new Headers(),
}));

const tmpDir = path.join(os.tmpdir(), `marketgym-validation-${process.pid}`);
const dataFile = path.join(tmpDir, "data.json");

beforeAll(async () => {
  await fs.mkdir(tmpDir, { recursive: true });
  stubLocalEnv(vi, dataFile);
  const { resetEnvCache } = await import("@/lib/config/env");
  resetEnvCache();
});
afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("Zod schemas reject malformed bodies", () => {
  it("scenarioAttemptSchema", async () => {
    const { scenarioAttemptSchema } = await import("@/lib/server/validation");
    expect(scenarioAttemptSchema.safeParse({}).success).toBe(false);
    expect(scenarioAttemptSchema.safeParse({ answer: "short", hintsUsed: 0 }).success).toBe(false);
    expect(scenarioAttemptSchema.safeParse({ answer: "x".repeat(50), hintsUsed: 9 }).success).toBe(false);
    expect(scenarioAttemptSchema.safeParse({ answer: "x".repeat(50), hintsUsed: "2" }).success).toBe(false);
    expect(scenarioAttemptSchema.safeParse({ answer: "x".repeat(5000), hintsUsed: 0 }).success).toBe(false);
    expect(scenarioAttemptSchema.safeParse({ answer: "a reasonable answer with some words", hintsUsed: 1 }).success).toBe(true);
  });

  it("profileUpsertSchema", async () => {
    const { profileUpsertSchema } = await import("@/lib/server/validation");
    expect(profileUpsertSchema.safeParse({}).success).toBe(false);
    expect(
      profileUpsertSchema.safeParse({
        displayName: "",
        experienceLevel: "new",
        learningGoal: "read-market-data",
        preferredLearningStyle: "concise",
        interests: [],
      }).success,
    ).toBe(false);
    expect(
      profileUpsertSchema.safeParse({
        displayName: "QA",
        experienceLevel: "guru", // not in enum
        learningGoal: "read-market-data",
        preferredLearningStyle: "concise",
        interests: [],
      }).success,
    ).toBe(false);
    expect(
      profileUpsertSchema.safeParse({
        displayName: "QA",
        experienceLevel: "new",
        learningGoal: "read-market-data",
        preferredLearningStyle: "concise",
        interests: new Array(13).fill("markets"),
      }).success,
    ).toBe(false);
    expect(
      profileUpsertSchema.safeParse({
        displayName: "QA",
        experienceLevel: "new",
        learningGoal: "read-market-data",
        preferredLearningStyle: "concise",
        interests: ["markets"],
      }).success,
    ).toBe(true);
  });

  it("diagnosticSubmitSchema", async () => {
    const { diagnosticSubmitSchema } = await import("@/lib/server/validation");
    expect(diagnosticSubmitSchema.safeParse({}).success).toBe(false);
    expect(diagnosticSubmitSchema.safeParse({ answers: [] }).success).toBe(false);
    expect(diagnosticSubmitSchema.safeParse({ answers: [{ questionId: "q1" }] }).success).toBe(false);
    expect(diagnosticSubmitSchema.safeParse({ answers: [{ questionId: "q1", value: 42 }] }).success).toBe(false);
    expect(diagnosticSubmitSchema.safeParse({ answers: [{ questionId: "q1", value: "x".repeat(2001) }] }).success).toBe(false);
    expect(diagnosticSubmitSchema.safeParse({ answers: [{ questionId: "q1", value: "a" }] }).success).toBe(true);
  });

  it("coach / orderbook / market schemas bound their inputs", async () => {
    const v = await import("@/lib/server/validation");
    expect(v.coachRespondSchema.safeParse({ sessionId: "s", message: "" }).success).toBe(false);
    expect(v.coachRespondSchema.safeParse({ sessionId: "s", message: "x".repeat(2001) }).success).toBe(false);
    expect(v.orderBookExerciseSubmitSchema.safeParse({ exerciseId: "e", market: "../../etc", answers: { a: 1 }, snapshotTimestamp: "t" }).success).toBe(false);
    expect(v.orderBookExerciseSubmitSchema.safeParse({ exerciseId: "e", market: "vBTC_vUSDC", answers: {}, snapshotTimestamp: "t" }).success).toBe(false);
    const { orderBookQuerySchema } = await import("@/lib/market-data/params");
    expect(orderBookQuerySchema.safeParse({ market: "vBTC_vUSDC", limit: "5000" }).success).toBe(false);
    expect(orderBookQuerySchema.safeParse({ market: "perps:ANT-USD" }).success).toBe(true);
    expect(orderBookQuerySchema.safeParse({ market: "../../wealth/users/x" }).success).toBe(false);
    expect(v.marketSnapshotQuerySchema.safeParse({ assets: "BTC,ETH,SOL,ADA,DOT,LINK,AVAX" }).success).toBe(false);
    expect(v.marketSnapshotQuerySchema.safeParse({ assets: "btc, eth" }).data?.assets).toEqual(["BTC", "ETH"]);
  });
});

describe("route handlers return 400 validation_error (local mode)", () => {
  const cases: Array<{ file: string; url: string; method: "POST" | "PUT"; params?: Record<string, string> }> = [
    { file: "app/api/scenarios/[id]/attempt/route.ts", url: "/api/scenarios/does-not-exist/attempt", method: "POST", params: { id: "does-not-exist" } },
    { file: "app/api/profile/route.ts", url: "/api/profile", method: "PUT" },
    { file: "app/api/diagnostic/route.ts", url: "/api/diagnostic", method: "POST" },
  ];

  for (const c of cases) {
    const present = fileExists(c.file);
    const run = present ? it : it.skip;
    run(`${c.method} ${c.url} — empty object, wrong types and malformed JSON → 400${present ? "" : " (route not landed yet)"}`, async (ctx) => {
      const mod = await loadOrSkip(ctx, () => import(/* @vite-ignore */ `${path.resolve(__dirname, "../../..", c.file)}`) as Promise<RouteModule>);
      for (const body of [{}, { answer: 1, hintsUsed: "x" }, { answers: "nope" }, { displayName: 5 }]) {
        const { status, body: env } = await callRoute(mod, c.method, c.url, { body }, c.params);
        expect(status, `${c.method} ${c.url} body=${JSON.stringify(body)}`).toBe(400);
        expect((env as { ok: boolean }).ok).toBe(false);
        expect((env as { error: { code: string } }).error.code).toBe("validation_error");
      }
      const malformed = await callRoute(mod, c.method, c.url, { rawBody: "{not json" }, c.params);
      expect(malformed.status).toBe(400);
      expect((malformed.body as { error: { code: string } }).error.code).toBe("validation_error");
    });
  }
});
