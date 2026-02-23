import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images-static.iracing.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'members-assets.iracing.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
