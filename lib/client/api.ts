/**
 * Thin fetch helpers that unwrap the ApiResponse envelope.
 * Safe for both client and server components (no Next-only imports here).
 * Server components that need cookies forwarded should use lib/client/server-api.ts.
 */
import type { ApiErrorCode, ApiResponse } from "@/lib/types/api";

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isApiClientError(err: unknown): err is ApiClientError {
  return err instanceof ApiClientError;
}

export interface ApiRequestOptions {
  /** absolute origin, e.g. http://localhost:3002; omit on the client */
  baseUrl?: string;
  /** extra headers (server side: forwarded cookie) */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function parse<T>(res: Response): Promise<T> {
  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }
  if (body && typeof body === "object" && "ok" in body) {
    if (body.ok) return body.data;
    throw new ApiClientError(body.error.code, body.error.message, res.status, body.error.details);
  }
  // Non-envelope answer (404 page, proxy error, route not built yet).
  const code: ApiErrorCode =
    res.status === 404
      ? "not_found"
      : res.status === 401
        ? "unauthenticated"
        : res.status === 429
          ? "rate_limited"
          : res.status >= 500
            ? "upstream_unavailable"
            : "internal_error";
  throw new ApiClientError(code, `Request failed (${res.status})`, res.status);
}

function url(path: string, baseUrl?: string): string {
  return baseUrl ? `${baseUrl}${path}` : path;
}

export async function apiGet<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url(path, opts.baseUrl), {
      method: "GET",
      headers: { accept: "application/json", ...opts.headers },
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    throw new ApiClientError(
      "upstream_unavailable",
      err instanceof Error ? err.message : "Network error",
      0,
    );
  }
  return parse<T>(res);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  opts: ApiRequestOptions = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url(path, opts.baseUrl), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...opts.headers,
      },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    throw new ApiClientError(
      "upstream_unavailable",
      err instanceof Error ? err.message : "Network error",
      0,
    );
  }
  return parse<T>(res);
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  opts: ApiRequestOptions = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url(path, opts.baseUrl), {
      method: "PUT",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...opts.headers,
      },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    throw new ApiClientError(
      "upstream_unavailable",
      err instanceof Error ? err.message : "Network error",
      0,
    );
  }
  return parse<T>(res);
}

/** Plain-language message for an error, for ErrorState descriptions. */
export function describeError(err: unknown): string {
  if (isApiClientError(err)) {
    switch (err.code) {
      case "not_found":
        return err.status === 404 && err.message.startsWith("Request failed")
          ? "This part of the service is not available yet."
          : err.message;
      case "unauthenticated":
        return "You need to be signed in to see this.";
      case "rate_limited":
        return "Too many requests. Wait a moment and try again.";
      case "upstream_unavailable":
        return err.status === 0
          ? "Could not reach the server. Check your connection and try again."
          : "A data source is unavailable right now. Try again in a moment.";
      case "validation_error":
        return err.message || "Something in the request was not valid.";
      default:
        return err.message || "Something went wrong.";
    }
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
