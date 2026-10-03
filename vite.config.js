import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.PAGES_BASE_PATH || './',
  // Rapier's compatibility package embeds its WASM; keep it in its own chunk.
  build: { target: 'es2022', chunkSizeWarningLimit: 5000 },
});
