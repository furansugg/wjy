import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('kana-svg-data')) return 'kana-data';
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
