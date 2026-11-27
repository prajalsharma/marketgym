/**
 * Route-handler helpers: response envelope, ApiError, and `handle()` which
 * maps thrown errors to the ApiResponse envelope + HTTP status.
 */
import { ZodError } from "zod";
import { API_STATUS, type ApiErr, type ApiErrorCode, type ApiOk } from "@/lib/types";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: unknown;
  constructor(code: ApiErrorCode, message?: string, details?: unknown) {
    super(message ?? defaultMessage(code));
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

function defaultMessage(code: ApiErrorCode): string {
  switch (code) {
    case "unauthenticated":
      return "You need to be signed in.";
    case "forbidden":
      return "You do not have access to this resource.";
    case "not_found":
      return "Not found.";
    case "validation_error":
      return "The request was invalid.";
    case "rate_limited":
      return "Too many requests. Please slow down.";
    case "upstream_unavailable":
      return "A data provider is unavailable right now.";
    case "internal_error":
      return "Something went wrong on our side.";
  }
}

export function ok<T>(data: T, init?: ResponseInit): Response {
  const body: ApiOk<T> = { ok: true, data };
  return Response.json(body, { status: 200, ...init });
}

export function fail(code: ApiErrorCode, message?: string, details?: unknown, init?: ResponseInit): Response {
  const body: ApiErr = {
    ok: false,
    error: { code, message: message ?? defaultMessage(code), ...(details !== undefined ? { details } : {}) },
  };
  return Response.json(body, { status: API_STATUS[code], ...init });
}

function newErrorId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Wrap a route handler so that any thrown error becomes a well-formed
 * ApiErr. ZodError → validation_error (400), ApiError → mapped status,
 * everything else → internal_error (500) with a logged id and no leakage.
 */
export function handle<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>): (req: Request, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return errorToResponse(err);
    }
  };
}

export function errorToResponse(err: unknown): Response {
  if (err instanceof ZodError) {
    return fail("validation_error", "Request validation failed.", err.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  if (err instanceof ApiError) {
    return fail(err.code, err.message, err.details);
  }
  if (err instanceof SyntaxError) {
    // Request.json() on a malformed body
    return fail("validation_error", "Request body must be valid JSON.");
  }
  const id = newErrorId();
  console.error(`[api] internal_error ${id}`, err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err);
  return fail("internal_error", `Something went wrong on our side (ref ${id}).`);
}

/** Parse a JSON body; malformed JSON → validation_error. */
export async function readJson(req: Request): Promise<unknown> {
  // JSON only: a cross-site HTML form cannot send application/json without a CORS preflight
  const type = (req.headers.get("content-type") ?? "").toLowerCase();
  if (!type.includes("application/json")) throw new ApiError("validation_error", "Content-Type must be application/json.");
  try {
    return await req.json();
  } catch {
    throw new ApiError("validation_error", "Request body must be valid JSON.");
  }
}

/** URLSearchParams → plain object (first value wins), for Zod query schemas. */
export function queryObject(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(req.url).searchParams) if (!(k in out)) out[k] = v;
  return out;
}

export function newId(prefix?: string): string {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}
