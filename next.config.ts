import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // An isolated directory lets browser tests run without colliding with a
  // developer's active `next dev` process and its lock file.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
