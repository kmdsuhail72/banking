import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@banking/shared-types"],
};

export default nextConfig;
