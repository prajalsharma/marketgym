import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/client/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/login", "/signup"], disallow: ["/app/", "/api/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
