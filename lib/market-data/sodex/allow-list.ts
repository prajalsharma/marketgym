/**
 * The ONLY SoDEX gateway paths this app may call: public, unsigned GETs
 * (docs/CONTRACTS.md, "Wave 2 ... Hard rule"). Anything else — auth,
 * nonce/verify, deposits, redemptions, RFQ, orders, claims, per-user
 * endpoints — is rejected before a request is built.
 */

/** case-sensitive SoDEX Wealth fund id, e.g. "vQQQ", "antb", "Morpho-Earn" */
export const FUND_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const FUND = "[A-Za-z0-9][A-Za-z0-9._-]{0,63}";

export const SODEX_ALLOWED_PATHS: readonly RegExp[] = [
  // spot + perps public market data (/markets/symbols, /markets/{symbol}/orderbook, ...)
  /^\/api\/v1\/(?:spot|perps)\/markets(?:\/[A-Za-z0-9_.-]+){1,2}$/,
  // wealth public reads
  /^\/api\/v1\/wealth\/funds$/,
  new RegExp(`^/api/v1/wealth/funds/${FUND}$`),
  new RegExp(`^/api/v1/wealth/funds/${FUND}/(?:price-history|dca-history)$`),
  /^\/api\/v1\/wealth\/markets$/,
  // rewards public reads
  /^\/api\/v1\/sopoints\/volume-weights$/,
  /^\/api\/v1\/sopoints\/week\/info$/,
  /^\/api\/v1\/lottery\/meta$/,
  /^\/api\/v1\/lottery\/feed$/,
];

export function isAllowedSodexPath(pathname: string): boolean {
  return SODEX_ALLOWED_PATHS.some((re) => re.test(pathname));
}

/** Throws unless `url` is an allow-listed public SoDEX read. */
export function assertAllowedSodexUrl(url: URL): void {
  if (!isAllowedSodexPath(url.pathname)) {
    throw new Error(`SoDEX adapter only calls /markets/* and allow-listed public read endpoints; refused ${url.pathname}`);
  }
}

/** "https://mainnet-gw.sodex.dev/api/v1/spot" → "https://mainnet-gw.sodex.dev/api/v1" */
export function gatewayRoot(spotBaseUrl: string): string {
  return spotBaseUrl.replace(/\/+$/, "").replace(/\/(?:spot|perps)$/, "");
}
