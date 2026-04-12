import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow the standalone HTML file (file:// = null origin) and localhost to call the API
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
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
