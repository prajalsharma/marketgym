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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
};

export default nextConfig;
