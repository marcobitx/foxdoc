// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react(), tailwind()],
  server: { port: 4321 },
  vite: {
    server: {
      proxy: {
        '/api': 'http://localhost:8000',
        '/health': 'http://localhost:8000',
      },
    },
  },
});
