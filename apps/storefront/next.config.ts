import type { NextConfig } from "next";

const commerce = process.env.COMMERCE_API_URL ?? "http://127.0.0.1:8787";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@lume/domain"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/commerce/:path*",
        destination: `${commerce}/:path*`,
      },
    ];
  },
};

export default nextConfig;
