/**
 * Server-side Supabase clients (cookie-based via @supabase/ssr).
 * Never import from client components: the service-role client must stay
 * on the server. Browser code uses lib/auth/browser.ts.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/config/env";

export type ServerSupabase = SupabaseClient;

function requireSupabaseConfig(): { url: string; anonKey: string } {
  const env = getEnv();
  if (!env.supabaseEnabled || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}

/**
 * Per-request client bound to the caller's session cookies. RLS applies.
 * Create a fresh one per request; never cache across requests.
 */
export async function createSupabaseServerClient(): Promise<ServerSupabase> {
  const { url, anonKey } = requireSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies cannot be written there.
          // proxy.ts refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}

let serviceClient: SupabaseClient | null = null;

/**
 * Service-role client: bypasses RLS. Used only for server-computed rows
 * (mastery, reviews, activity, scenarios). Never expose to the client.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;
  const env = getEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side writes.");
  }
  serviceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return serviceClient;
}
