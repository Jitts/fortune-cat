import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Type errors block the build — `npm run typecheck` is clean and stays that
  // way. There is no `eslint` key any more: Next 16 removed `next lint`, so
  // there is nothing to opt out of during the build.
  experimental: {
    serverActions: {
      // PDFs and screenshots arrive as extracted text (a long statement can
      // still be hundreds of KB) — headroom over the 1MB default.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
