import type { MetadataRoute } from "next";

const BASE = "https://fortune-cat-nu.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/upgrade`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/signup`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
