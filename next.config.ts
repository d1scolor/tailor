import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    middlewareClientMaxBodySize: "20mb",
    serverActions: {
      bodySizeLimit: "25mb"
    }
  }
};

export default withNextIntl(nextConfig);
