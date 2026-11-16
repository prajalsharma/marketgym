/**
 * Shared logic for /api/auth/* route handlers. Local mode: no accounts, the
 * single implicit learner is sent to onboarding. Supabase mode: email +
 * password via Supabase Auth with cookie sessions (set by @supabase/ssr).
 */
import { isLocalMode } from "@/lib/auth/session";
import { ApiError, ok, readJson } from "./api";
import { enforceRateLimit } from "./rate-limit";
import { authCredentialsSchema } from "./validation";

export interface AuthResult {
  mode: "local" | "supabase";
  redirectTo: string;
  needsEmailConfirmation?: boolean;
  userId?: string;
}

const ONBOARDING = "/app/onboarding";

function safeNext(next: string | undefined, fallback: string): string {
  if (!next) return fallback;
  // only same-origin relative paths; never protocol-relative or absolute URLs
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) return fallback;
  return next;
}

async function readCredentials(req: Request): Promise<{ email: string; password: string; displayName?: string; next?: string; isForm: boolean }> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await req.formData();
    const obj: Record<string, string> = {};
    for (const [k, v] of form) if (typeof v === "string") obj[k] = v;
    return { ...authCredentialsSchema.parse(obj), isForm: true };
  }
  const body = await readJson(req);
  return { ...authCredentialsSchema.parse(body), isForm: false };
}

function respond(req: Request, result: AuthResult, isForm: boolean): Response {
  const wantsHtml = isForm || (req.headers.get("accept") ?? "").includes("text/html");
  if (wantsHtml) {
    return Response.redirect(new URL(result.redirectTo, req.url), 303);
  }
  return ok(result);
}

export async function handleSignup(req: Request): Promise<Response> {
  enforceRateLimit(req, "auth");
  if (isLocalMode()) {
    const isForm = (req.headers.get("content-type") ?? "").includes("form");
    return respond(req, { mode: "local", redirectTo: ONBOARDING }, isForm);
  }
  const creds = await readCredentials(req);
  const { createSupabaseServerClient } = await import("@/lib/auth/supabase");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: creds.email,
    password: creds.password,
    options: { data: { display_name: creds.displayName ?? creds.email.split("@")[0] } },
  });
  if (error) {
    console.warn(`[auth] signup failed: ${error.status ?? "?"} ${error.name}`);
    throw new ApiError("validation_error", friendlyAuthMessage(error.message, "Could not create the account."));
  }
  const needsEmailConfirmation = !data.session;
  return respond(
    req,
    {
      mode: "supabase",
      redirectTo: needsEmailConfirmation ? "/login?confirm=1" : safeNext(creds.next, ONBOARDING),
      needsEmailConfirmation,
      ...(data.user ? { userId: data.user.id } : {}),
    },
    creds.isForm,
  );
}

export async function handleLogin(req: Request): Promise<Response> {
  enforceRateLimit(req, "auth");
  if (isLocalMode()) {
    const isForm = (req.headers.get("content-type") ?? "").includes("form");
    return respond(req, { mode: "local", redirectTo: ONBOARDING }, isForm);
  }
  const creds = await readCredentials(req);
  const { createSupabaseServerClient } = await import("@/lib/auth/supabase");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password });
  if (error || !data.user) {
    console.warn(`[auth] login failed: ${error?.status ?? "?"} ${error?.name ?? "no user"}`);
    throw new ApiError("unauthenticated", "Email or password is incorrect.");
  }
  return respond(req, { mode: "supabase", redirectTo: safeNext(creds.next, "/app"), userId: data.user.id }, creds.isForm);
}

export async function handleLogout(req: Request): Promise<Response> {
  const isForm = (req.headers.get("content-type") ?? "").includes("form");
  if (isLocalMode()) {
    return respond(req, { mode: "local", redirectTo: "/" }, isForm);
  }
  const { createSupabaseServerClient } = await import("@/lib/auth/supabase");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.warn(`[auth] signOut: ${error.name}`);
  return respond(req, { mode: "supabase", redirectTo: "/" }, isForm);
}

function friendlyAuthMessage(upstream: string, fallback: string): string {
  const m = upstream.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) return "An account with this email already exists. Try logging in.";
  if (m.includes("password")) return "Password does not meet the requirements (at least 8 characters).";
  if (m.includes("email")) return "Please enter a valid email address.";
  return fallback;
}
