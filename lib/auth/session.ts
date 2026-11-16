/**
 * Auth boundary (docs/CONTRACTS.md). All server code resolves the learner
 * through these two functions, in both Supabase and local mode.
 */
import { getEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/server/api";
import { LOCAL_USER, type AuthUser } from "./local";

export type { AuthUser } from "./local";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const env = getEnv();
  if (!env.supabaseEnabled) return LOCAL_USER;
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
  return !getEnv().supabaseEnabled;
}
