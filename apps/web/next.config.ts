import path from 'path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@langafy/shared-types', '@langafy/shared-game-logic'],
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking — disallow embedding this site in iframes
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME type sniffing attacks
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Restrict referrer information sent to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions Policy: allow microphone for Phase 7 voice input, block unused sensors
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          // Content Security Policy
          // - script-src: 'unsafe-inline' required by Next.js inline scripts
          // - connect-src: Firebase Auth domains + API
          // - frame-src: Firebase sign-in popup
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://apis.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
              "frame-src https://accounts.google.com https://*.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
