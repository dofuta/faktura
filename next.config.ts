import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
