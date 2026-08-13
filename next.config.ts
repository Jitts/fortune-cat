import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Type errors block the build — `npm run typecheck` is clean and stays that
  // way. Lint stays advisory: `next lint` is deprecated and its failures are
  // style, not correctness.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: {
      // PDFs and screenshots arrive as extracted text (a long statement can
      // still be hundreds of KB) — headroom over the 1MB default.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
