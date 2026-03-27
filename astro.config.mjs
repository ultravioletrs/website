import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://www.ultraviolet.rs",
  output: "static",

  integrations: [
    tailwind(),
    sitemap({
      filenameBase: "sitemap", // This will output sitemap.xml
      changefreq: "hourly",
      priority: 1.0,
      serialize(item) {
        item.lastmod = new Date().toISOString(); // Sets all pages to the build time

        return item;
      },
    }),
  ],

  adapter: cloudflare(),
});
