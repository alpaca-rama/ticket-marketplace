import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: 'beaming-wolverine-451.convex.cloud',
        protocol: 'https',
      }
    ]
  }
};

export default nextConfig;
