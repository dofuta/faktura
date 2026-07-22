import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "puppeteer-core", "@sparticuz/chromium"],
  // @sparticuz/chromiumのバイナリはトレースで自動検出されないため明示的に含める
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
