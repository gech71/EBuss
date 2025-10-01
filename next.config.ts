import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false, // remove "X-Powered-By" header
  async headers() {
    return [];
  },
  typescript: {
    ignoreBuildErrors: true, // ignore TS build errors
  },
  eslint: {
    ignoreDuringBuilds: true, // ignore ESLint errors during build
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
