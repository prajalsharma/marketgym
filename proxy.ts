/**
 * Next.js 16 proxy (formerly middleware): refreshes the Supabase session and
 * protects /app/*. In local mode (no Supabase env) it passes requests through.
 */
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/proxy-session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except API routes, Next internals and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|woff2?)$).*)"],
};
