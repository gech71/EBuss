import type {NextConfig} from 'next';

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' https://api.qrserver.com data:;
    connect-src 'self';
    frame-src 'self';
    frame-ancestors 'self';
`.replace(/\s{2,}/g, ' ').trim();


const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
        {
            source: '/(.*)',
            headers: [
                {
                    key: 'Content-Security-Policy',
                    value: cspHeader,
                }
            ]
        }
    ]
  }
};

export default nextConfig;
