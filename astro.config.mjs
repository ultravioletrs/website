import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://www.ultraviolet.rs',
  integrations: [tailwind()],
  image: {
    domains: ['avatars.githubusercontent.com'],
  },
});
