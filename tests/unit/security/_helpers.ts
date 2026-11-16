/**
 * Shared helpers for security unit tests. Route handlers are loaded straight
 * from app/api/** so the tests exercise the real auth/validation/rate-limit
 * wiring (no HTTP server). Missing files ⇒ the caller it.skip()s.
 */
import path from "node:path";
import { existsSync } from "node:fs";

export const REPO_ROOT = path.resolve(__dirname, "../../..");

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
export type RouteModule = Partial<Record<Method, Handler>>;

export const METHODS: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** Converts a route file path (relative to repo root) into its URL path, e.g. app/api/scenarios/[id]/route.ts → /api/scenarios/test-id */
export function routeUrlPath(file: string, params: Record<string, string> = { id: "test-id" }): string {
  const rel = file.replace(/^.*?app\//, "").replace(/\/route\.tsx?$/, "");
  return (
    "/" +
    rel
      .split("/")
      .filter((seg) => !/^\(.*\)$/.test(seg)) // route groups
      .map((seg) => seg.replace(/^\[\.{3}(\w+)\]$/, (_, k) => params[k] ?? "x").replace(/^\[(\w+)\]$/, (_, k) => params[k] ?? "x"))
      .join("/")
  );
}

export function makeRequest(
  urlPath: string,
  method: Method,
  opts: { body?: unknown; rawBody?: string; headers?: Record<string, string>; query?: string } = {},
): Request {
  const url = `http://localhost:3100${urlPath}${opts.query ? `?${opts.query}` : ""}`;
  const headers: Record<string, string> = { "x-forwarded-for": "203.0.113.7", ...opts.headers };
  const init: RequestInit = { method, headers };
  if (method !== "GET" && method !== "DELETE") {
    headers["content-type"] = "application/json";
    init.body = opts.rawBody ?? JSON.stringify(opts.body ?? {});
  }
  return new Request(url, init);
}

export const ctx = (params: Record<string, string> = { id: "test-id" }) => ({ params: Promise.resolve(params) });

export async function callRoute(
  mod: RouteModule,
  method: Method,
  urlPath: string,
  opts: Parameters<typeof makeRequest>[2] = {},
  params?: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  const handler = mod[method];
  if (!handler) throw new Error(`no ${method} on ${urlPath}`);
  const res = await handler(makeRequest(urlPath, method, opts), ctx(params));
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

/**
 * Import a route module; if it fails only because a dependency has not landed
 * yet ("Cannot find package/module"), skip the test with that reason. Any other
 * import error is a real defect and propagates.
 */
export async function loadOrSkip<T>(ctx: { skip: (note?: string) => never }, importer: () => Promise<T>): Promise<T> {
  try {
    return await importer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Cannot find (package|module)|Failed to resolve import|ERR_MODULE_NOT_FOUND/.test(msg)) {
      const dep = msg.match(/Cannot find (?:package|module) '([^']+)'/)?.[1] ?? msg.split("\n")[0];
      ctx.skip(`dependency not landed yet: ${dep}`);
    }
    throw err;
  }
}

export function fileExists(rel: string): boolean {
  return existsSync(path.join(REPO_ROOT, rel));
}

/** Resolve the local-mode env: no Supabase, demo data, temp data file. */
export function stubLocalEnv(vi: typeof import("vitest").vi, dataFile: string, extra: Record<string, string> = {}): void {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("SOSOVALUE_API_KEY", "");
  vi.stubEnv("DEMO_MODE", "true");
  vi.stubEnv("MARKETGYM_DATA_FILE", dataFile);
  for (const [k, v] of Object.entries(extra)) vi.stubEnv(k, v);
}
