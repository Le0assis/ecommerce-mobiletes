import type { NextConfig } from "next";

const commerce = process.env.COMMERCE_API_URL ?? "http://127.0.0.1:8787";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "**.blob.vercel-storage.com" },
    ],
  },
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
  async redirects() {
    return [{ source: "/lojas", destination: "/contato", permanent: false }];
  },
};

export default nextConfig;
