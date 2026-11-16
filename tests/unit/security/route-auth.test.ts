/**
 * (a) Route authentication. Every handler under app/api is loaded at test time
 * (import.meta.glob) and called without a user in Supabase mode. Non-public
 * routes must answer 401 with the ApiErr envelope; /api/market/* (public,
 * rate-limited) must not answer 401.
 *
 * Supabase mode is simulated by mocking lib/auth/session so getCurrentUser()
 * resolves null and requireUser() throws the real ApiError("unauthenticated").
 */
import { describe, expect, it, vi, beforeAll } from "vitest";
import { METHODS, type RouteModule, callRoute, loadOrSkip, routeUrlPath } from "./_helpers";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], get: () => undefined, set: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/auth/session", async () => {
  const { ApiError } = await vi.importActual<typeof import("@/lib/server/api")>("@/lib/server/api");
  return {
    getCurrentUser: async () => null,
    requireUser: async () => {
      throw new ApiError("unauthenticated");
    },
    isLocalMode: () => false,
  };
});

// Public prefixes per docs/CONTRACTS.md ("/api/market/* is public but rate-limited").
// /api/auth/* (sign-up/log-in) and /api/health are public by nature.
const PUBLIC_PREFIXES = ["/api/market/", "/api/auth/", "/api/health"];

// Loaded lazily: the glob is resolved by Vite at transform time, so a tree
// without routes yields an empty object and the suite skips with a reason.
const routeFiles = import.meta.glob<RouteModule>("/app/api/**/route.ts");
const files = Object.keys(routeFiles).sort();

beforeAll(() => {
  vi.stubEnv("DEMO_MODE", "true");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-for-tests-only");
  vi.stubEnv("MARKETGYM_DATA_FILE", "/tmp/marketgym-route-auth-unused.json");
});

describe("route authentication (no user, Supabase mode)", () => {
  if (files.length === 0) {
    it.skip("no route handlers under app/api yet (backend not landed)", () => {});
    return;
  }

  for (const file of files) {
    const urlPath = routeUrlPath(file);
    const isPublic = PUBLIC_PREFIXES.some((p) => urlPath.startsWith(p));

    describe(urlPath, () => {
      it("exports at least one HTTP method", async (ctx) => {
        const mod = await loadOrSkip(ctx, routeFiles[file]!);
        expect(METHODS.some((m) => typeof mod[m] === "function"), `${file} exports no handler`).toBe(true);
      });

      for (const method of METHODS) {
        it(`${method} → ${isPublic ? "not 401 (public)" : "401 (protected)"}`, async (ctx) => {
          const mod = await loadOrSkip(ctx, routeFiles[file]!);
          if (typeof mod[method] !== "function") return; // method not exported
          const query = urlPath.includes("/market/orderbook") ? "market=vBTC_vUSDC&limit=20" : urlPath.includes("/coach/session") ? "id=test" : urlPath.includes("/scenarios/next") ? "skillId=markets.price" : undefined;
          const { status, body } = await callRoute(mod, method, urlPath, { body: {}, query });
          const env = body as { ok?: boolean; error?: { code?: string } } | null;
          if (isPublic) {
            expect(status, `${method} ${urlPath} should be public`).not.toBe(401);
          } else {
            expect(status, `${method} ${urlPath} must require a learner`).toBe(401);
            expect(env?.ok).toBe(false);
            expect(env?.error?.code).toBe("unauthenticated");
          }
          // Never leak internals: 500s are not acceptable for an unauthenticated probe.
          expect(status, `${method} ${urlPath} returned 500 for an anonymous request`).not.toBe(500);
        });
      }
    });
  }
});
