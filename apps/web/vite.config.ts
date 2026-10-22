import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:3001';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@qvanta/types': path.resolve(__dirname, '../../packages/types/src'),
        '@qvanta/ui': path.resolve(__dirname, '../../packages/ui/src')
      }
    },
    server: {
      port: 5173,
      headers: env.VITE_ENABLE_COOP === '1'
        ? {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp'
          }
        : undefined,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api/, '')
        },
        '/ws': {
          target: apiTarget,
          ws: true,
          changeOrigin: true
        }
      }
    }
  };
});
