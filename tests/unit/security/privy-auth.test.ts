/**
 * Privy mode auth: access-token verification against a locally generated
 * ES256 key + local JWKS (no network), the POST /api/auth/privy route, the
 * mg_session cookie round-trip, getCurrentUser() and the proxy redirect.
 * Storage is an in-memory stand-in for the Postgres repository (no DB).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from "jose";
import type { Profile } from "@/lib/types";

const APP_ID = "cm-test-privy-app";
const SECRET = "s".repeat(40);
const ALICE_DID = "did:privy:alice123";

// ---------- mocks ----------

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
    set: () => undefined,
  }),
  headers: async () => new Headers(),
}));

// in-memory stand-in for PostgresRepository's users/profiles (never touches a database)
const users = new Map<string, { id: string; privyDid: string; displayName: string | null; createdAt: string }>();
const profiles = new Map<string, Profile>();
const fakePg = {
  async upsertPrivyUser(privyDid: string, displayName: string) {
    const found = [...users.values()].find((u) => u.privyDid === privyDid);
    if (found) return { user: found, isNew: false };
    const user = { id: crypto.randomUUID(), privyDid, displayName, createdAt: new Date().toISOString() };
    users.set(user.id, user);
    return { user, isNew: true };
  },
  async getProfile(id: string) {
    return profiles.get(id) ?? null;
  },
  async upsertProfile(p: Profile) {
    profiles.set(p.id, p);
    return p;
  },
  async getSessionsValidAfter(id: string) {
    return revokedAt.get(id) ?? null;
  },
  async revokeSessions(id: string) {
    revokedAt.set(id, Math.floor(Date.now() / 1000));
  },
};
const revokedAt = new Map<string, number>();
vi.mock("@/lib/db", async (orig) => ({
  ...(await orig<typeof import("@/lib/db")>()),
  getPostgresRepositoryFromEnv: async () => fakePg,
}));

// ---------- keys ----------

let jwks: JWTVerifyGetKey;
let privyKey: CryptoKey;
let foreignKey: CryptoKey;

async function privyToken(opts: { aud?: string; iss?: string; sub?: string; exp?: number | string; key?: CryptoKey; claims?: Record<string, unknown> } = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sid: "session-1", ...opts.claims })
    .setProtectedHeader({ alg: "ES256", kid: "privy-test", typ: "JWT" })
    .setIssuer(opts.iss ?? "privy.io")
    .setAudience(opts.aud ?? APP_ID)
    .setSubject(opts.sub ?? ALICE_DID)
    .setIssuedAt(now - 10)
    .setExpirationTime(opts.exp ?? now + 3600)
    .sign(opts.key ?? privyKey);
}

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  privyKey = pair.privateKey;
  const pub = await exportJWK(pair.publicKey);
  jwks = createLocalJWKSet({ keys: [{ ...pub, kid: "privy-test", alg: "ES256", use: "sig" }] });
  foreignKey = (await generateKeyPair("ES256")).privateKey;

  vi.stubEnv("NEXT_PUBLIC_PRIVY_APP_ID", APP_ID);
  vi.stubEnv("DATABASE_URL", "postgres://unused:unused@127.0.0.1:1/unused");
  vi.stubEnv("SESSION_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("DEMO_MODE", "true");
  const { resetEnvCache, getEnv } = await import("@/lib/config/env");
  resetEnvCache();
  expect(getEnv().authMode).toBe("privy");
});

afterAll(async () => {
  vi.unstubAllEnvs();
  (await import("@/lib/config/env")).resetEnvCache();
});

beforeEach(async () => {
  (await import("@/lib/server/rate-limit")).resetRateLimits();
  cookieJar.clear();
});

// ---------- verifyPrivyToken ----------

describe("verifyPrivyToken", () => {
  it("accepts a valid Privy token and returns the DID", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy");
    const res = await verifyPrivyToken(await privyToken(), { jwks });
    expect(res.did).toBe(ALICE_DID);
  });

  const bad: Array<[string, () => Promise<string>]> = [
    ["wrong audience", () => privyToken({ aud: "someone-elses-app" })],
    ["wrong issuer", () => privyToken({ iss: "evil.example" })],
    ["expired", () => privyToken({ exp: Math.floor(Date.now() / 1000) - 120 })],
    ["signed by another key", () => privyToken({ key: foreignKey })],
    ["subject is not a Privy DID", () => privyToken({ sub: "0x52908400098527886E0F7030069857D2E4169EE7" })],
    [
      "HS256 (algorithm confusion)",
      () =>
        new SignJWT({})
          .setProtectedHeader({ alg: "HS256", kid: "privy-test" })
          .setIssuer("privy.io")
          .setAudience(APP_ID)
          .setSubject(ALICE_DID)
          .setIssuedAt()
          .setExpirationTime("1h")
          .sign(new TextEncoder().encode(SECRET)),
    ],
  ];

  it.each(bad)("rejects a token with %s as unauthenticated", async (_label, make) => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy");
    await expect(verifyPrivyToken(await make(), { jwks })).rejects.toMatchObject({ name: "ApiError", code: "unauthenticated" });
  });

  it("takes a display name from claims but never a wallet address", async () => {
    const { displayNameFromClaims } = await import("@/lib/auth/privy");
    expect(displayNameFromClaims({ name: "  Ada  " })).toBe("Ada");
    expect(displayNameFromClaims({ name: "0x52908400098527886E0F7030069857D2E4169EE7" })).toBe("Learner");
    expect(displayNameFromClaims({})).toBe("Learner");
  });
});

// ---------- POST /api/auth/privy ----------

async function callPrivyRoute(body: unknown): Promise<Response> {
  const { handle } = await import("@/lib/server/api");
  const { handlePrivyLogin } = await import("@/lib/server/auth-routes");
  const route = handle(async (req: Request) => handlePrivyLogin(req, { jwks }));
  return route(
    new Request("http://localhost:3001/api/auth/privy", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.9" },
      body: JSON.stringify(body),
    }),
    {},
  );
}

function sessionFrom(res: Response): string | null {
  const raw = res.headers.get("set-cookie") ?? "";
  const m = raw.match(/mg_session=([^;]*)/);
  return m ? m[1]! : null;
}

describe("POST /api/auth/privy", () => {
  it("verifies, creates the user + profile, and sets an httpOnly mg_session cookie", async () => {
    const res = await callPrivyRoute({ accessToken: await privyToken() });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data: { userId: string; isNew: boolean } };
    expect(json.ok).toBe(true);
    expect(json.data.isNew).toBe(true);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=604800/);
    const { verifySessionToken } = await import("@/lib/auth/session-token");
    expect(await verifySessionToken(sessionFrom(res), SECRET)).toBe(json.data.userId);
    const profile = profiles.get(json.data.userId)!;
    expect(profile).toMatchObject({ displayName: "Learner", experienceLevel: "new", learningGoal: "read-market-data", onboardingCompletedAt: null });
    // nothing wallet-like is stored
    expect(JSON.stringify([...users.values()])).not.toMatch(/0x[0-9a-fA-F]{40}/);

    const again = await callPrivyRoute({ accessToken: await privyToken() });
    const json2 = (await again.json()) as { data: { userId: string; isNew: boolean } };
    expect(json2.data).toEqual({ userId: json.data.userId, isNew: false });
  });

  it.each([
    ["wrong audience", { aud: "other-app" }],
    ["wrong issuer", { iss: "nope.example" }],
    ["expired", { exp: Math.floor(Date.now() / 1000) - 600 }],
  ])("answers 401 for a token with %s and sets no cookie", async (_l, opts) => {
    const res = await callPrivyRoute({ accessToken: await privyToken(opts) });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("unauthenticated");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("answers 400 for a missing or malformed accessToken", async () => {
    expect((await callPrivyRoute({})).status).toBe(400);
    expect((await callPrivyRoute({ accessToken: "not a jwt at all, definitely" })).status).toBe(400);
  });

  it("is mounted at app/api/auth/privy", async () => {
    const mod = await import("@/app/api/auth/privy/route");
    expect(typeof mod.POST).toBe("function");
  });
});

// ---------- email/password routes + logout in privy mode ----------

describe("auth routes in privy mode", () => {
  const req = (p: string) =>
    new Request(`http://localhost:3001${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "a@b.co", password: "password123" }) });

  it("signup and login answer 400 pointing at Privy", async () => {
    const routes = { signup: await import("@/app/api/auth/signup/route"), login: await import("@/app/api/auth/login/route") };
    for (const [p, mod] of Object.entries(routes)) {
      const res = await mod.POST(req(`/api/auth/${p}`), {});
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: { message: string } }).error.message).toMatch(/Privy/);
    }
  });

  it("logout clears mg_session", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST(req("/api/auth/logout"), {});
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^mg_session=;/);
    expect(cookie).toMatch(/Max-Age=0/);
    expect(cookie).toMatch(/HttpOnly/);
  });
});

// ---------- session cookie + getCurrentUser + proxy ----------

describe("mg_session", () => {
  const USER = "11111111-2222-4333-8444-555555555555";

  it("round-trips and rejects tampering, other secrets, expiry and non-uuid subjects", async () => {
    const { signSessionToken, verifySessionToken } = await import("@/lib/auth/session-token");
    const token = await signSessionToken(USER, SECRET);
    expect(await verifySessionToken(token, SECRET)).toBe(USER);
    expect(await verifySessionToken(token, "x".repeat(40))).toBeNull();
    const [h, p, s] = token.split(".");
    expect(await verifySessionToken(`${h}.${p}.${s!.slice(0, -2)}AA`, SECRET)).toBeNull();
    expect(await verifySessionToken(token, SECRET, new Date(Date.now() + 8 * 24 * 3600 * 1000))).toBeNull();
    expect(await verifySessionToken(undefined, SECRET)).toBeNull();
    await expect(signSessionToken("did:privy:abc", SECRET)).rejects.toThrow();
    // a Privy access token is not a session token
    expect(await verifySessionToken(await privyToken(), SECRET)).toBeNull();
  });

  it("getCurrentUser() resolves the learner from the cookie in privy mode", async () => {
    const { getCurrentUser, requireUser } = await import("@/lib/auth/session");
    expect(await getCurrentUser()).toBeNull();
    await expect(requireUser()).rejects.toMatchObject({ code: "unauthenticated" });
    const { signSessionToken } = await import("@/lib/auth/session-token");
    cookieJar.set("mg_session", await signSessionToken(USER, SECRET));
    expect(await getCurrentUser()).toEqual({ id: USER, email: null });
    cookieJar.set("mg_session", "garbage");
    expect(await getCurrentUser()).toBeNull();
  });

  it("a session cookie issued before sign-out is refused, a later one works", async () => {
    const { getCurrentUser } = await import("@/lib/auth/session");
    const { signSessionToken } = await import("@/lib/auth/session-token");
    const old = await signSessionToken(USER, SECRET, new Date(Date.now() - 60_000));
    cookieJar.set("mg_session", old);
    expect(await getCurrentUser()).toEqual({ id: USER, email: null });
    await fakePg.revokeSessions(USER); // what /api/auth/logout does
    expect(await getCurrentUser()).toBeNull(); // the copied cookie is dead
    cookieJar.set("mg_session", await signSessionToken(USER, SECRET, new Date(Date.now() + 2_000)));
    expect(await getCurrentUser()).toEqual({ id: USER, email: null });
    revokedAt.delete(USER);
  });

  it("proxy redirects /app/* without a valid session to /login?next=…", async () => {
    const { NextRequest } = await import("next/server");
    const { updateSession } = await import("@/lib/auth/proxy-session");
    const anon = await updateSession(new NextRequest("http://localhost:3001/app/portfolio?tab=2"));
    expect(anon.status).toBe(307);
    const loc = new URL(anon.headers.get("location")!);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("next")).toBe("/app/portfolio?tab=2");

    const pub = await updateSession(new NextRequest("http://localhost:3001/"));
    expect(pub.headers.get("location")).toBeNull();

    const { signSessionToken } = await import("@/lib/auth/session-token");
    const authed = await updateSession(new NextRequest("http://localhost:3001/app", { headers: { cookie: `mg_session=${await signSessionToken(USER, SECRET)}` } }));
    expect(authed.headers.get("location")).toBeNull();
    expect(authed.status).toBe(200);
  });
});
