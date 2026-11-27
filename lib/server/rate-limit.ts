/**
 * In-memory token-bucket rate limiter keyed by ip or user id. Per-instance
 * only (documented limitation; swap for Redis/Upstash when scaling out).
 */
import { ApiError } from "./api";

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitPolicy {
  /** bucket capacity = requests allowed per window */
  limit: number;
  /** window length in ms */
  windowMs: number;
}

export const RATE_LIMITS = {
  market: { limit: 60, windowMs: 60_000 },
  coach: { limit: 30, windowMs: 60_000 },
  scenarios: { limit: 30, windowMs: 60_000 },
  auth: { limit: 20, windowMs: 60_000 },
  default: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitScope = keyof typeof RATE_LIMITS;

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function consume(key: string, policy: RateLimitPolicy, now = Date.now()): RateLimitResult {
  const refillPerMs = policy.limit / policy.windowMs;
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) sweep(now, policy.windowMs);
    bucket = { tokens: policy.limit, updatedAt: now };
    buckets.set(key, bucket);
  }
  const elapsed = Math.max(0, now - bucket.updatedAt);
  bucket.tokens = Math.min(policy.limit, bucket.tokens + elapsed * refillPerMs);
  bucket.updatedAt = now;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterSeconds: 0 };
  }
  const retryAfterSeconds = Math.ceil((1 - bucket.tokens) / refillPerMs / 1000);
  return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
}

function sweep(now: number, windowMs: number): void {
  for (const [k, b] of buckets) if (now - b.updatedAt > windowMs * 2) buckets.delete(k);
  // still full: evict the oldest tenth (Map keeps insertion order) instead of
  // clearing everything, so flooding with new keys cannot reset other limits
  if (buckets.size >= MAX_BUCKETS) {
    let drop = Math.ceil(MAX_BUCKETS / 10);
    for (const k of buckets.keys()) {
      if (drop-- <= 0) break;
      buckets.delete(k);
    }
  }
}

export function clientIp(req: Request): string {
  const h = req.headers;
  // Prefer headers the hosting platform sets itself (Vercel overwrites these, so a
  // client cannot spoof them); the leftmost x-forwarded-for entry is the last resort.
  const platform = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("cf-connecting-ip");
  if (platform) return platform.split(",")[0]!.trim();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return "anonymous";
}

/**
 * Enforce a rate limit for a request. `subject` is a user id when known,
 * otherwise the client ip. Throws ApiError("rate_limited") when exhausted.
 */
export function enforceRateLimit(req: Request, scope: RateLimitScope, subject?: string | null): RateLimitResult {
  const policy = RATE_LIMITS[scope];
  const key = `${scope}:${subject ?? `ip:${clientIp(req)}`}`;
  const result = consume(key, policy);
  if (!result.allowed) {
    throw new ApiError("rate_limited", `Rate limit exceeded for ${scope}. Retry in ${result.retryAfterSeconds}s.`, {
      retryAfterSeconds: result.retryAfterSeconds,
      limit: policy.limit,
      windowSeconds: policy.windowMs / 1000,
    });
  }
  return result;
}

/** test helper */
export function resetRateLimits(): void {
  buckets.clear();
}
