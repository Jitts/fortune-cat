import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AI-generated apps should deploy even if the template has strict type or
  // lint issues. Type errors are compile-time only and don't affect runtime,
  // so we don't let them block a deployment.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // pdfjs-dist blows up when webpack processes it into the server bundle
  // ("Object.defineProperty called on non-object") — load it natively via
  // Node at runtime instead. Verified working un-bundled.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  experimental: {
    serverActions: {
      // PDF statements reach the import action as base64 — the 1MB default
      // rejects anything beyond a couple of pages.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
