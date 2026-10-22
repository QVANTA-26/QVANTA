import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, __dirname, '');
    var apiTarget = env.VITE_API_URL || 'http://localhost:3001';
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
                    rewrite: function (requestPath) { return requestPath.replace(/^\/api/, ''); }
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
