// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import robots from "astro-robots";

// https://astro.build/config
export default defineConfig({
  integrations: [
    mdx(),
    tailwind(),
    sitemap(),
    react(),
    robots({
      host: "example.dev",
      sitemap: ["https://example.dev/sitemap-index.xml"],
      policy: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/contact", "/*/contact"],
          crawlDelay: 10,
        },
      ],
    }),
  ],
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
  },
  site: "https://example.dev",
  output: "static",
  prefetch: {
    defaultStrategy: "tap",
  },
});
