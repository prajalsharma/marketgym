/**
 * Auth boundary (docs/CONTRACTS.md). All server code resolves the learner
 * through these functions, whatever getEnv().authMode is:
 *  - privy:    httpOnly `mg_session` cookie (HS256 JWT, SESSION_SECRET), sub = MarketGym user uuid
 *  - supabase: Supabase Auth cookie session
 *  - local:    the single implicit demo learner (refused in production unless ALLOW_LOCAL_MODE)
 */
import { getEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/server/api";
import { LOCAL_USER, type AuthUser } from "./local";
import { SESSION_COOKIE, verifySessionClaims } from "./session-token";

export type { AuthUser } from "./local";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const env = getEnv();
  if (env.authMode === "privy") {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const claims = await verifySessionClaims(store.get(SESSION_COOKIE)?.value, env.SESSION_SECRET);
    if (!claims) return null;
    // a cookie copied before sign-out must stop working: compare with the user's revocation time
    const { getPostgresRepositoryFromEnv } = await import("@/lib/db");
    const validAfter = await (await getPostgresRepositoryFromEnv()).getSessionsValidAfter(claims.userId);
    if (validAfter !== null && claims.issuedAt < validAfter) return null;
    return { id: claims.userId, email: null };
  }
  if (env.authMode === "local") {
    // local mode = one shared learner with no login; never let it run silently in production
    if (env.NODE_ENV === "production" && !env.ALLOW_LOCAL_MODE) {
      throw new ApiError("upstream_unavailable", "Accounts are not configured on this server. Set the Privy or Supabase variables, or ALLOW_LOCAL_MODE=true for a single-user demo.");
    }
    return LOCAL_USER;
  }
  const { createSupabaseServerClient } = await import("./supabase");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("unauthenticated");
  return user;
}

/** True when running with the single implicit local learner. */
export function isLocalMode(): boolean {
  return getEnv().authMode === "local";
}

/** True when Privy sign-in (with Postgres storage) is active. */
export function isPrivyMode(): boolean {
  return getEnv().authMode === "privy";
}
