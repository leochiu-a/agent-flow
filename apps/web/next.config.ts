import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@agent-flow/core"],
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
