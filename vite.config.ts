import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  // Get proxy target from environment variable, fallback to default
  let proxy_config = {};
  if (env.PROXY_SERVER) {
    proxy_config = {
      '/api-proxy/': {
        target: env.PROXY_SERVER,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          return path.replace(/^\/api-proxy/, '');
        }
      }
    }
  }

  return {
    preview: {
      allowedHosts: true,
      proxy: proxy_config
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    plugins: [react()],
    define: {
      'process.env.PROXY_SERVER': JSON.stringify(env.PROXY_SERVER)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    assetsInclude: ['**/*.md']
  };
});
