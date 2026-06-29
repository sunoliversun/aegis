import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aegis/api", "@aegis/db"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
