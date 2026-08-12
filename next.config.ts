import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "testbooru.donmai.us",
      }
    ]
  }
};

export default nextConfig;
