import path from 'path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@langafy/shared-types', '@langafy/shared-game-logic'],
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
};

export default nextConfig;
