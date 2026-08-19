import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the trace root to this repo. A stray lockfile in a parent directory
  // otherwise makes the build trace the wrong tree and bloat the deployment.
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [
      {
        // Client Magic link surface. Zero login, and it must not leak the token
        // through a referrer or end up in a search index. docs/15-SECURITY.md §3.
        source: '/v/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
