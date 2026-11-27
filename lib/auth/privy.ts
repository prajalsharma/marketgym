/**
 * Privy access-token verification (server only). The token is an ES256 JWT
 * signed by Privy; we verify it against the app's public JWKS
 * (https://auth.privy.io/api/v1/apps/<appId>/jwks.json), issuer "privy.io",
 * audience = app id. No Privy app secret is used anywhere.
 */
import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import { getEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/server/api";

export const PRIVY_ISSUER = "privy.io";

export function privyJwksUrl(appId: string): URL {
  return new URL(`https://auth.privy.io/api/v1/apps/${encodeURIComponent(appId)}/jwks.json`);
}

// createRemoteJWKSet caches keys (and refetches on unknown kid with a cooldown); keep one per app id.
const remoteSets = new Map<string, JWTVerifyGetKey>();

function remoteJwks(appId: string): JWTVerifyGetKey {
  let set = remoteSets.get(appId);
  if (!set) {
    set = createRemoteJWKSet(privyJwksUrl(appId), { timeoutDuration: 5_000, cooldownDuration: 30_000, cacheMaxAge: 10 * 60_000 });
    remoteSets.set(appId, set);
  }
  return set;
}

export interface VerifiedPrivyToken {
  /** Privy DID, e.g. did:privy:abc123 */
  did: string;
  claims: JWTPayload;
}

export interface VerifyPrivyOptions {
  appId?: string;
  /** test seam: a local JWKS (createLocalJWKSet) instead of Privy's remote one */
  jwks?: JWTVerifyGetKey;
}

/**
 * Verify a Privy access token. Bad/expired/foreign tokens → ApiError("unauthenticated") (401);
 * Privy's JWKS unreachable → ApiError("upstream_unavailable") (503).
 */
export async function verifyPrivyToken(accessToken: string, opts: VerifyPrivyOptions = {}): Promise<VerifiedPrivyToken> {
  const appId = opts.appId ?? getEnv().NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) throw new ApiError("upstream_unavailable", "Privy is not configured on this server.");
  try {
    const { payload } = await jwtVerify(accessToken, opts.jwks ?? remoteJwks(appId), {
      issuer: PRIVY_ISSUER,
      audience: appId,
      algorithms: ["ES256"],
      clockTolerance: 5,
      requiredClaims: ["sub", "exp", "iat"],
    });
    const did = payload.sub;
    if (typeof did !== "string" || !did.startsWith("did:privy:") || did.length > 200) {
      throw new ApiError("unauthenticated", "Sign-in token is not a Privy user token.");
    }
    return { did, claims: payload };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof errors.JWKSTimeout || (!(err instanceof errors.JOSEError) && err instanceof TypeError)) {
      console.warn(`[auth] Privy JWKS unavailable: ${err.message}`);
      throw new ApiError("upstream_unavailable", "Could not reach Privy to check the sign-in. Try again shortly.");
    }
    const code = err instanceof errors.JOSEError ? err.code : "unknown";
    console.warn(`[auth] Privy token rejected: ${code}`);
    throw new ApiError("unauthenticated", "Sign-in token is invalid or expired. Please sign in again.");
  }
}

/** Display name to store for a Privy user: from token claims when present, else "Learner". Never a wallet address. */
export function displayNameFromClaims(claims: Record<string, unknown>): string {
  for (const key of ["name", "display_name", "given_name"]) {
    const v = claims[key];
    if (typeof v === "string") {
      const trimmed = v.trim().slice(0, 80);
      if (trimmed.length > 0 && !/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return trimmed;
    }
  }
  return "Learner";
}

/** test helper */
export function resetPrivyJwksCache(): void {
  remoteSets.clear();
}
