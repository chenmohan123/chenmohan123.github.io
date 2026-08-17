import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://chenmohan123.github.io',
  output: 'static',
  integrations: [react()],
});
