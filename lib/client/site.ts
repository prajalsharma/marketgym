/** Public site URL for metadata routes. Only NEXT_PUBLIC_* is read here. */
export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE_NAME = "MarketGym";
export const SITE_DESCRIPTION =
  "Learn to read crypto markets by reasoning over real evidence. A coach diagnoses what you know, sets practice scenarios with live data, and grades your thinking.";
