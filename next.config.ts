import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,

  turbopack: {
    root: __dirname,
  },

  experimental: {
    agentFeedback: false,
  },
};

export default nextConfig;
