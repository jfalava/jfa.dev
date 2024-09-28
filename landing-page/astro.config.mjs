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
      host: "jfa.dev",
      sitemap: ["https://jfa.dev/sitemap-index.xml"],
      policy: [
        {
          userAgent: "*",
          allow: "/",
          disallow: "none",
          crawlDelay: 10,
        },
      ],
    }),
  ],
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
  },
  site: "https://jfa.dev",
  output: "static",
  prefetch: {
    defaultStrategy: "tap",
  },
});
