import { defineConfig } from 'astro/config';

// Fully static output. No integrations, no client framework.
export default defineConfig({
  output: 'static',
  build: { inlineStylesheets: 'always' },
  // Emit the 1 KB ₹ font as a file: Vite would inline it as a data: URI, which CSP font-src 'self' blocks.
  vite: { build: { assetsInlineLimit: 0 } },
  image: { service: { entrypoint: 'astro/assets/services/sharp' } },
});
