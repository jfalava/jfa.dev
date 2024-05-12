import { defineConfig } from 'astro/config';
import cloudflare from "@astrojs/cloudflare";
import solidJs from "@astrojs/solid-js";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  output: "server",
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    routing: {
        prefixDefaultLocale: true
    }
  },
  adapter: cloudflare(),
  integrations: [solidJs(), tailwind(), mdx(), react()]
});