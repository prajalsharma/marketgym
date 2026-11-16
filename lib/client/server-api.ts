/**
 * Server-component variant of the API helpers: builds an absolute URL from the
 * incoming request's host and forwards the cookie header so auth works.
 * Only import this from server components / server files.
 */
import { headers } from "next/headers";
import { apiGet, apiPost, apiPut, type ApiRequestOptions } from "./api";

async function serverOptions(): Promise<ApiRequestOptions> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const cookie = h.get("cookie");
  return {
    baseUrl: `${proto}://${host}`,
    headers: cookie ? { cookie } : undefined,
  };
}

export async function serverGet<T>(path: string): Promise<T> {
  return apiGet<T>(path, await serverOptions());
}

export async function serverPost<T>(path: string, body: unknown): Promise<T> {
  return apiPost<T>(path, body, await serverOptions());
}

export async function serverPut<T>(path: string, body: unknown): Promise<T> {
  return apiPut<T>(path, body, await serverOptions());
}

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: unknown };

/** Catch-all wrapper so pages can render ErrorState instead of throwing. */
export async function load<T>(path: string): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await serverGet<T>(path) };
  } catch (error) {
    return { ok: false, error };
  }
}
