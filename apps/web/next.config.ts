import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aegis/api", "@aegis/db"],
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
