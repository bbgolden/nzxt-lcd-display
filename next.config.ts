import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "testbooru.donmai.us",
      },
      {
        protocol: "https",
        hostname: "testbooru-cdn.donmai.us",
      },
      {
        protocol: "https",
        hostname: "danbooru.donmai.us",
      },
      {
        protocol: "https",
        hostname: "cdn.donmai.us",
      }
    ]
  }
};

export default nextConfig;
