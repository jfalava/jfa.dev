import { createReadStream, existsSync } from "node:fs";
import { basename, join } from "node:path";

import type { Plugin } from "vite";

const PREFIX = "/shared/fonts/";
const fontsDirectory = join(import.meta.dirname, "../../../function/router/public/shared/fonts");

/**
 * Fonts in `common/src/fonts.css` and `pretendard.css` live once at
 * `/shared/fonts/`, served by the router's asset layer in production. Builds
 * leave those URLs alone instead of warning that they do not resolve, and an
 * app's own dev server serves the same files so local dev keeps its fonts.
 */
export function sharedFonts(): Plugin {
  return {
    name: "jfa:shared-fonts",
    config: () => ({
      build: { rolldownOptions: { external: [/^\/shared\/fonts\//] } },
    }),
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split("?")[0] ?? "";
        const file = join(fontsDirectory, basename(pathname));
        if (!pathname.startsWith(PREFIX) || !existsSync(file)) {
          next();
          return;
        }
        response.setHeader("Content-Type", "font/woff2");
        createReadStream(file).pipe(response);
      });
    },
  };
}
