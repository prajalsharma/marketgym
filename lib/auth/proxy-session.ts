/**
 * Session handling for proxy.ts, by getEnv().authMode:
 *  - privy:    /app/* needs a valid `mg_session` cookie, else redirect to /login?next=…
 *  - supabase: keeps the Supabase auth cookies fresh and protects /app/*
 *  - local:    no-op (one implicit learner, nothing to refresh)
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/config/env";
import { SESSION_COOKIE, verifySessionToken } from "./session-token";

const PROTECTED_PREFIX = "/app";

function isProtected(pathname: string): boolean {
  return pathname === PROTECTED_PREFIX || pathname.startsWith(`${PROTECTED_PREFIX}/`);
}

function loginRedirect(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const env = getEnv();

  if (env.authMode === "privy") {
    if (!isProtected(request.nextUrl.pathname)) return NextResponse.next({ request });
    const userId = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, env.SESSION_SECRET);
    return userId ? NextResponse.next({ request }) : loginRedirect(request);
  }

  if (env.authMode !== "supabase" || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() validates the token with Supabase Auth and triggers a refresh when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(request.nextUrl.pathname)) {
    const redirect = loginRedirect(request);
    // carry refreshed cookies (if any) onto the redirect
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }
  return response;
}
