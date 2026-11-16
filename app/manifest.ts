import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MarketGym",
    short_name: "MarketGym",
    description: "Learn to read crypto markets by reasoning over real evidence, with a coach that grades your thinking.",
    start_url: "/app",
    display: "standalone",
    background_color: "#0b0d10",
    theme_color: "#0b0d10",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
