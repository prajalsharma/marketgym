"use client";
/**
 * Browser Supabase client (anon key only). Returns null in local mode.
 * NEXT_PUBLIC_* values are public by definition and are inlined at build
 * time, so they are read here directly instead of through getEnv() (which is
 * server-only). No secret ever appears in this file.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && anonKey ? createBrowserClient(url, anonKey) : null;
  return client;
}

/** True when the app is running against Supabase (vs. local demo mode). */
export function isSupabaseEnabledInBrowser(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
