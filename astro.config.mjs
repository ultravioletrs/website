import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://www.ultraviolet.rs",
  output: "static",

  integrations: [
    tailwind(),
    sitemap({
      filenameBase: "sitemap",
      filter: (page) =>
        ![
          "/cube/privacy/",
          "/cube/terms/",
          "/prism/privacy/",
          "/prism/terms/",
        ].some((path) => page.endsWith(path)),
      serialize(item) {
        item.lastmod = new Date().toISOString();

        if (item.url === "https://www.ultraviolet.rs/") {
          item.changefreq = "weekly";
          item.priority = 1.0;
        } else if (/\/products\//.test(item.url)) {
          item.changefreq = "monthly";
          item.priority = 0.9;
        } else if (/\/solutions\/|\/industries\//.test(item.url)) {
          item.changefreq = "monthly";
          item.priority = 0.8;
        } else if (/\/blog\//.test(item.url)) {
          item.changefreq = "monthly";
          item.priority = 0.7;
        } else if (/\/projects\//.test(item.url)) {
          item.changefreq = "monthly";
          item.priority = 0.6;
        } else {
          item.changefreq = "monthly";
          item.priority = 0.5;
        }

        return item;
      },
    }),
  ],

  adapter: cloudflare(),
});
