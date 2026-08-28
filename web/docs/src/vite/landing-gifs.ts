import fs from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";

const VIRTUAL_ID = "virtual:landing-gifs";
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

/**
 * Vite plugin that discovers numbered gifs in `public/gifs` at build time
 * and exposes them as a virtual module. Adding `public/gifs/3.gif` (etc.)
 * is picked up on the next build/dev restart with no code change.
 *
 * The module `virtual:landing-gifs` exports:
 * - `gifs: string[]` — mount-relative paths like `gifs/1.gif` (join with
 *   `import.meta.env.BASE_URL` at the call site)
 * - `count: number`
 */
export function landingGifs(): Plugin {
  let gifsDir = "";

  const getGifs = (): string[] => {
    try {
      const entries = fs.readdirSync(gifsDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && /^\d+\.gif$/i.test(entry.name))
        .map((entry) => entry.name)
        .toSorted((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
        .map((name) => `gifs/${name}`);
    } catch {
      return [];
    }
  };

  return {
    name: "jfa:landing-gifs",
    configResolved(config) {
      gifsDir = path.resolve(config.root, "public/gifs");
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_VIRTUAL_ID;
      }
      return null;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) {
        return null;
      }

      const gifs = getGifs();

      return `export const gifs = ${JSON.stringify(gifs)};\nexport const count = ${String(gifs.length)};\n`;
    },
    configureServer(server) {
      if (!fs.existsSync(gifsDir)) {
        return;
      }
      // Watch the gifs directory; on add/remove trigger a full reload so
      // the virtual module is re-evaluated. Lightweight and avoids polling.
      try {
        const watcher = fs.watch(gifsDir, () => {
          const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
          }
          server.ws.send({ type: "full-reload" });
        });
        server.httpServer?.once("close", () => {
          watcher.close();
        });
      } catch {
        // Non-fatal: dev will still pick up new gifs on next restart/build.
      }
    },
  };
}
