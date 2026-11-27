/**
 * Shared logic for /api/auth/* route handlers. Local mode: no accounts, the
 * single implicit learner is sent to onboarding. Supabase mode: email +
 * password via Supabase Auth with cookie sessions (set by @supabase/ssr).
 * Privy mode: the client signs in with Privy and posts the access token to
 * /api/auth/privy; email/password sign-up and log-in are refused.
 */
import { displayNameFromClaims, verifyPrivyToken, type VerifyPrivyOptions } from "@/lib/auth/privy";
import { isLocalMode } from "@/lib/auth/session";
import { clearedSessionCookie, sessionCookie, signSessionToken } from "@/lib/auth/session-token";
import { getEnv } from "@/lib/config/env";
import { getPostgresRepositoryFromEnv } from "@/lib/db";
import { ApiError, ok, readJson } from "./api";
import { defaultProfile } from "./learner";
import { enforceRateLimit } from "./rate-limit";
import { authCredentialsSchema, privyLoginSchema } from "./validation";

export interface AuthResult {
  mode: "local" | "supabase" | "privy";
  redirectTo: string;
  needsEmailConfirmation?: boolean;
  userId?: string;
}

const ONBOARDING = "/app/onboarding";

function safeNext(next: string | undefined, fallback: string): string {
  if (!next) return fallback;
  // only same-origin relative paths; never protocol-relative or absolute URLs
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) return fallback;
  // backslashes and control characters (tab, newline) make URL parsers read "/\evil.com" as another host
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const u = new URL(next, "https://marketgym.invalid");
    if (u.origin !== "https://marketgym.invalid") return fallback;
  } catch {
    return fallback;
  }
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

const PRIVY_ONLY = "This server signs in with Privy. Use the Privy sign-in on the log-in page.";

// read from env directly (not lib/auth/session) so tests that mock the session module keep working
function isPrivyMode(): boolean {
  return getEnv().authMode === "privy";
}

function cookieAttrs(): { secure: boolean } {
  return { secure: getEnv().NODE_ENV === "production" };
}

export async function handleSignup(req: Request): Promise<Response> {
  enforceRateLimit(req, "auth");
  if (isPrivyMode()) throw new ApiError("validation_error", PRIVY_ONLY);
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
  if (isPrivyMode()) throw new ApiError("validation_error", PRIVY_ONLY);
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
  if (isPrivyMode()) {
    // revoke server-side too, so a copied cookie dies at sign-out and not 7 days later
    const { getCurrentUser } = await import("@/lib/auth/session");
    const current = await getCurrentUser().catch(() => null);
    if (current) await (await getPostgresRepositoryFromEnv()).revokeSessions(current.id);
    const res = respond(req, { mode: "privy", redirectTo: "/" }, isForm);
    return withCookie(res, clearedSessionCookie(cookieAttrs()));
  }
  if (isLocalMode()) {
    return respond(req, { mode: "local", redirectTo: "/" }, isForm);
  }
  const { createSupabaseServerClient } = await import("@/lib/auth/supabase");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.warn(`[auth] signOut: ${error.name}`);
  return respond(req, { mode: "supabase", redirectTo: "/" }, isForm);
}

/** Response.redirect() has immutable headers; rebuild with the Set-Cookie added. */
function withCookie(res: Response, cookie: string): Response {
  const headers = new Headers(res.headers);
  headers.append("set-cookie", cookie);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export interface PrivyLoginResult {
  userId: string;
  isNew: boolean;
}

/**
 * POST /api/auth/privy { accessToken }: verify the Privy token, find-or-create
 * the MarketGym user by Privy DID (no wallet addresses, no email stored),
 * create the profile for new users, and set the httpOnly `mg_session` cookie.
 */
export async function handlePrivyLogin(req: Request, opts: VerifyPrivyOptions = {}): Promise<Response> {
  enforceRateLimit(req, "auth");
  if (!isPrivyMode()) throw new ApiError("validation_error", "Privy sign-in is not enabled on this server.");
  const { accessToken } = privyLoginSchema.parse(await readJson(req));
  const { did, claims } = await verifyPrivyToken(accessToken, opts);

  const repo = await getPostgresRepositoryFromEnv();
  const displayName = displayNameFromClaims(claims);
  const { user, isNew } = await repo.upsertPrivyUser(did, displayName);
  // same defaults as the Supabase on-signup trigger; also heals a missing profile
  if (isNew || !(await repo.getProfile(user.id))) {
    await repo.upsertProfile({ ...defaultProfile({ id: user.id, email: null }), displayName: user.displayName ?? displayName });
  }

  const env = getEnv();
  const token = await signSessionToken(user.id, env.SESSION_SECRET ?? "");
  return withCookie(ok<PrivyLoginResult>({ userId: user.id, isNew }), sessionCookie(token, cookieAttrs()));
}

function friendlyAuthMessage(upstream: string, fallback: string): string {
  const m = upstream.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) return "An account with this email already exists. Try logging in.";
  if (m.includes("password")) return "Password does not meet the requirements (at least 8 characters).";
  if (m.includes("email")) return "Please enter a valid email address.";
  return fallback;
}
