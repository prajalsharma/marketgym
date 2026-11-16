/**
 * Shared harness for route-handler tests: local mode (no Supabase), DEMO_MODE
 * (no network), a temp data file, and a switchable current user.
 */
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";
import type { ApiResponse } from "@/lib/types";

export interface TestUser {
  id: string;
  email: string | null;
}

const auth: { current: TestUser | null } = { current: { id: "local-demo-user", email: null } };

vi.mock("@/lib/auth/session", async () => {
  const { ApiError } = await import("@/lib/server/api");
  return {
    getCurrentUser: async () => auth.current,
    requireUser: async () => {
      if (!auth.current) throw new ApiError("unauthenticated");
      return auth.current;
    },
    isLocalMode: () => true,
  };
});

export async function setupLocalEnv(): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "marketgym-api-"));
  process.env.MARKETGYM_DATA_FILE = path.join(dir, "store.json");
  process.env.DEMO_MODE = "true";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  process.env.OPENAI_API_KEY = "";
  process.env.SOSOVALUE_API_KEY = "";
  const { resetEnvCache } = await import("@/lib/config/env");
  const { resetRepositoryCache } = await import("@/lib/db");
  const { resetRateLimits } = await import("@/lib/server/rate-limit");
  const { resetMarketServices } = await import("@/lib/market-data/services");
  resetEnvCache();
  resetRepositoryCache();
  resetRateLimits();
  resetMarketServices();
  auth.current = { id: "local-demo-user", email: null };
  return {
    dir,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

export function asUser(user: TestUser | null): void {
  auth.current = user;
}

const ORIGIN = "http://localhost:3001";

export function get(pathname: string, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${pathname}`, { method: "GET", headers });
}

export function post(pathname: string, body: unknown, method = "POST", headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${pathname}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export async function body<T>(res: Response): Promise<ApiResponse<T>> {
  return (await res.json()) as ApiResponse<T>;
}

export async function okData<T>(res: Response): Promise<T> {
  const b = await body<T>(res);
  if (!b.ok) throw new Error(`expected ok response, got ${res.status} ${b.error.code}: ${b.error.message}`);
  return b.data;
}

export const noParams = { params: Promise.resolve({}) };
export const withId = (id: string) => ({ params: Promise.resolve({ id }) });
