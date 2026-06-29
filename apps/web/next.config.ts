import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aegis/api", "@aegis/db"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
