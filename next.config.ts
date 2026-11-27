import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets parallel agents/E2E use their own build dir (NEXT_DIST_DIR=.next-e2e).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // read from disk at runtime by lib/db/postgres; make sure Vercel bundles it
  outputFileTracingIncludes: { "/**": ["./lib/db/postgres/schema.sql"] },
  // Every platform page is personalised and cookie-authenticated, so component
  // caching is off; market data is cached server-side in lib/market-data/cache.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
};

export default nextConfig;
