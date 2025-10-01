import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false, // remove "X-Powered-By" header
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // prevents MIME sniffing
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY', // prevents clickjacking
          },
        ],
      },
    ];
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
