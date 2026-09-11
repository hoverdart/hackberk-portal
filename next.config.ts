import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep navigation correctness independent of progressive browser animation.
  // Next 16.3 supports React ViewTransition in the App Router without a flag.
  // An isolated directory lets browser tests run without colliding with a
  // developer's active `next dev` process and its lock file.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
