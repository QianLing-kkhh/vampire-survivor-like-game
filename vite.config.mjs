import { defineConfig } from 'vite';

export default defineConfig({
  base: '/vampire-survivor-like-game/',
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return id.includes('node_modules/phaser') ? 'vendor-phaser' : undefined;
        }
      }
    }
  },
  server: {
    port: 5173
  }
});
