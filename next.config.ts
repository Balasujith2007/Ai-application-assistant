import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gzip all responses
  compress: true,
  // Remove X-Powered-By header for security
  poweredByHeader: false,

  serverExternalPackages: ['tesseract.js'],

  experimental: {
    optimizePackageImports: [
      'recharts',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-progress',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-popover',
    ],
  },

  // HTTP response headers for caching + security
  async headers() {
    return [
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              // Cache static assets aggressively (JS/CSS chunks) in production only
              source: '/_next/static/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ]
        : []),
      {
        // Prevent caching of all dynamic API routes across all browsers
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        // Security headers for all pages
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
