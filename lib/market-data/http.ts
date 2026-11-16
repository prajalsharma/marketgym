/**
 * Outbound HTTP for provider adapters: timeout (6 s), one retry on
 * network/timeout/5xx, status + content-type checks, JSON parse. Upstream
 * bodies are never surfaced to clients; errors carry provider + status only.
 */
export type UpstreamProvider = "sosovalue" | "sodex";

export type UpstreamFailureKind = "timeout" | "network" | "http" | "malformed" | "provider_error" | "budget";

export class UpstreamError extends Error {
  readonly provider: UpstreamProvider;
  readonly kind: UpstreamFailureKind;
  readonly status: number | null;
  readonly retryAfterMs: number | null;
  constructor(provider: UpstreamProvider, kind: UpstreamFailureKind, message: string, status: number | null = null, retryAfterMs: number | null = null) {
    super(`[${provider}] ${kind}${status !== null ? ` ${status}` : ""}: ${message}`);
    this.name = "UpstreamError";
    this.provider = provider;
    this.kind = kind;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export interface FetchJsonOptions {
  provider: UpstreamProvider;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  /** injectable for tests */
  fetchImpl?: typeof fetch;
}

export interface JsonResponse {
  status: number;
  headers: Headers;
  body: unknown;
}

const DEFAULT_TIMEOUT_MS = 6_000;
const DEFAULT_RETRIES = 1;

function parseRetryAfter(headers: Headers): number | null {
  const ra = headers.get("retry-after");
  if (ra) {
    const seconds = Number(ra);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(ra);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  }
  const reset = headers.get("x-ratelimit-reset");
  if (reset) {
    const n = Number(reset);
    if (Number.isFinite(n)) {
      // SoSoValue documents ms epoch; SoDEX sends epoch seconds.
      const ms = n > 1e12 ? n : n * 1000;
      return Math.max(0, ms - Date.now());
    }
  }
  return null;
}

async function attemptOnce(url: string, opts: FetchJsonOptions): Promise<JsonResponse> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json", ...(opts.headers ?? {}) },
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new UpstreamError(opts.provider, "timeout", `no response within ${timeoutMs} ms`);
    }
    throw new UpstreamError(opts.provider, "network", err instanceof Error ? err.message : "fetch failed");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // drain body without exposing it; log a short, safe snippet server-side
    const snippet = await res
      .text()
      .then((t) => t.slice(0, 200).replace(/\s+/g, " "))
      .catch(() => "");
    console.warn(`[market-data] ${opts.provider} HTTP ${res.status} for ${redact(url)}${snippet ? ` :: ${snippet}` : ""}`);
    throw new UpstreamError(opts.provider, "http", `HTTP ${res.status}`, res.status, res.status === 429 ? parseRetryAfter(res.headers) : null);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (!/json/i.test(contentType) && !looksLikeJson(text)) {
    console.warn(`[market-data] ${opts.provider} non-JSON response (${contentType || "no content-type"}) for ${redact(url)}`);
    throw new UpstreamError(opts.provider, "malformed", `expected JSON, got ${contentType || "unknown content-type"}`, res.status);
  }
  try {
    return { status: res.status, headers: res.headers, body: JSON.parse(text) as unknown };
  } catch {
    console.warn(`[market-data] ${opts.provider} malformed JSON for ${redact(url)}`);
    throw new UpstreamError(opts.provider, "malformed", "response body was not valid JSON", res.status);
  }
}

function looksLikeJson(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

/** Strip query values that could be secrets before logging a URL. */
function redact(url: string): string {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (/key|token|secret/i.test(k)) u.searchParams.set(k, "***");
    return u.toString();
  } catch {
    return url;
  }
}

function retryable(err: UpstreamError): boolean {
  if (err.kind === "timeout" || err.kind === "network") return true;
  if (err.kind === "http" && err.status !== null && err.status >= 500) return true;
  return false;
}

/** GET a JSON document with timeout + retry. Throws UpstreamError. */
export async function fetchJson(url: string, opts: FetchJsonOptions): Promise<JsonResponse> {
  const retries = opts.retries ?? DEFAULT_RETRIES;
  let lastErr: UpstreamError | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attemptOnce(url, opts);
    } catch (err) {
      if (err instanceof UpstreamError) {
        lastErr = err;
        if (i < retries && retryable(err)) continue;
        throw err;
      }
      throw err;
    }
  }
  throw lastErr ?? new UpstreamError(opts.provider, "network", "unreachable");
}
