import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in surfaces — nothing indexable behind these.
      disallow: [
        "/app",
        "/review",
        "/settings",
        "/account",
        "/insights",
        "/welcome",
        "/feedback",
        "/api/",
        "/auth/",
        "/reset-password",
        "/forgot-password",
      ],
    },
    sitemap: "https://fortune-cat-nu.vercel.app/sitemap.xml",
  };
}
