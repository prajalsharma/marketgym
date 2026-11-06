import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
