/**
 * MarketGym's own session for privy mode: an HS256 JWT signed with
 * SESSION_SECRET, carried in the httpOnly cookie `mg_session`.
 * `sub` = MarketGym user uuid (never the Privy DID, never a wallet address).
 * Free of next/headers so proxy.ts and tests can use it directly.
 */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "mg_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const ISSUER = "marketgym";
const AUDIENCE = "marketgym:session";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function key(secret: string): Uint8Array {
  if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(userId: string, secret: string, now = new Date()): Promise<string> {
  if (!UUID.test(userId)) throw new Error("session subject must be a MarketGym user uuid");
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_TTL_SECONDS)
    .sign(key(secret));
}

/** The user uuid from a valid session token, else null (bad signature, expired, malformed). */
export async function verifySessionToken(token: string | undefined | null, secret: string | undefined | null, now?: Date): Promise<string | null> {
  if (!token || !secret || secret.length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
      ...(now ? { currentDate: now } : {}),
    });
    return typeof payload.sub === "string" && UUID.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}

export interface CookieAttrs {
  secure: boolean;
}

/** Set-Cookie value for a fresh session. */
export function sessionCookie(token: string, attrs: CookieAttrs): string {
  return [`${SESSION_COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${SESSION_TTL_SECONDS}`, ...(attrs.secure ? ["Secure"] : [])].join("; ");
}

/** Set-Cookie value that clears the session. */
export function clearedSessionCookie(attrs: CookieAttrs): string {
  return [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0", "Expires=Thu, 01 Jan 1970 00:00:00 GMT", ...(attrs.secure ? ["Secure"] : [])].join("; ");
}
