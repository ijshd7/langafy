import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@langafy/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@langafy/shared-game-logic': path.resolve(
        __dirname,
        '../../packages/shared-game-logic/src/index.ts'
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
