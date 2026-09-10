import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep navigation correctness independent of progressive browser animation.
  // Next 16.3 supports React ViewTransition in the App Router without a flag.
};

export default nextConfig;
