import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: ['.']
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2021'
  },
  clearScreen: false
});
