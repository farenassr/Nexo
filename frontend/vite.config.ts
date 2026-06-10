import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const serverTarget = process.env.SERVER_HTTPS || process.env.SERVER_HTTP;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API calls to the app service
      '/api': {
        target: serverTarget,
        changeOrigin: true,
        xfwd: true
      },
      '/v1': {
        target: serverTarget,
        changeOrigin: true,
        xfwd: true
      },
      '/auth': {
        target: serverTarget,
        changeOrigin: true,
        xfwd: true
      }
    }
  }
});
