import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dirname, "../../..");
const fontsDirectory = join(import.meta.dirname, "../public/shared/fonts");
const stylesheets = ["common/src/fonts.css", "common/src/pretendard.css"];

function referencedFonts(stylesheet: string): string[] {
  const css = readFileSync(join(repositoryRoot, stylesheet), "utf8");
  return [...css.matchAll(/url\("?\/shared\/fonts\/([^"')]+)/g)].map((match) => match[1] ?? "");
}

describe("shared fonts", () => {
  test("serves every font the shared stylesheets reference", () => {
    const files = new Set(readdirSync(fontsDirectory));
    for (const stylesheet of stylesheets) {
      const fonts = referencedFonts(stylesheet);
      expect(fonts.length).toBeGreaterThan(0);
      for (const font of fonts) {
        expect(files.has(font), `${stylesheet}: ${font}`).toBe(true);
      }
    }
  });

  // The asset layer caches these for a year, so a changed file must get a new name.
  test("names each font by its content hash", () => {
    for (const file of readdirSync(fontsDirectory)) {
      const hash = /-([0-9a-f]{10})\.\w+$/.exec(file)?.[1];
      const digest = createHash("sha256")
        .update(readFileSync(join(fontsDirectory, file)))
        .digest("hex");
      expect(hash, file).toBe(digest.slice(0, 10));
    }
  });
});
