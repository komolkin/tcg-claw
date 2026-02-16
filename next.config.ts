import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "arweave.net",
      },
      {
        protocol: "https",
        hostname: "images.pokemontcg.io",
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days — slab images never change
    formats: ["image/webp"],
  },
};

export default nextConfig;
