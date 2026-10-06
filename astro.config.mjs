import { defineConfig } from 'astro/config';

// Fully static output. No integrations, no client framework.
export default defineConfig({
  output: 'static',
  build: { inlineStylesheets: 'never' },
  // Emit the 1 KB ₹ font as a file: Vite would inline it as a data: URI, which CSP font-src 'self' blocks.
  // Keep animation-timeline separate: merging it into the animation shorthand breaks
  // browsers that support scroll timelines but not the new shorthand grammar.
  vite: { build: { assetsInlineLimit: 0, cssMinify: 'esbuild' } },
  image: { service: { entrypoint: 'astro/assets/services/sharp' } },
});
