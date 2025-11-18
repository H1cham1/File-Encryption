/**
 * Vite Configuration
 *
 * Simple build setup for TypeScript frontend with custom routing
 */

import { defineConfig } from 'vite';
import { Plugin } from 'vite';

// Custom plugin to handle /file/:id routes
function customRoutingPlugin(): Plugin {
  return {
    name: 'custom-routing',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Redirect /file/:id routes to file.html
        if (req.url && req.url.startsWith('/file/')) {
          req.url = '/file.html';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [customRoutingPlugin()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        file: 'file.html',
      },
    },
  },
});
