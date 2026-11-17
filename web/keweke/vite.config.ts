import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { execPath } from "node:process";
import path from "path";

import { pwaManifest } from "@jfa.dev/common/vite/pwa-manifest";
import { sharedFonts } from "@jfa.dev/common/vite/shared-fonts";
import { siteMeta } from "@jfa.dev/common/vite/site-meta";
import { sitemap } from "@jfa.dev/common/vite/sitemap";
import { packageTagline } from "@jfa.dev/common/web-packages";
import { transformSync } from "@nkzw/fbtee-compiler";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite-plus";

const MOUNT_PATH = "/keweke/";

/**
 * Compiles `<fbt>`, `fbt()` and `fbs()` in Keweke's source, and compiles the
 * editable catalogs in translations/ into the runtime catalogs in
 * src/translations/ once per build or dev-server start. Collecting first keeps
 * the source strings in step with the code, so a stale catalog cannot ship.
 * Run `bun run i18n:prepare` to add new strings to translations/ for translating.
 *
 * This replaces @nkzw/vite-plugin-fbtee: its id filter only matches plain
 * .js/.jsx/.ts/.tsx ids, so it skips TanStack Router's code-split route modules
 * (`index.tsx?tsr-split=component`) and ships their `<fbt>` tags uncompiled.
 */
function fbtee(): Plugin {
  // Alchemy runs this config from iac/, whose PATH lacks this package's bin.
  const cli = path.join(
    path.dirname(createRequire(import.meta.url).resolve("@nkzw/fbtee-compiler")),
    "bin.mjs",
  );
  let compiled = false;
  const run = (...args: string[]) => {
    const result = spawnSync(execPath, [cli, ...args], {
      cwd: import.meta.dirname,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      throw new Error(`fbtee ${args[0]} failed`);
    }
  };
  return {
    name: "keweke:fbtee",
    enforce: "pre",
    buildStart() {
      if (compiled) {
        return;
      }
      compiled = true;
      run("collect", "--src", "src", "--include-default-strings=false");
      run("translate", "--translations", "translations/*.json", "--output-dir", "src/translations");
    },
    transform: {
      filter: {
        code: /fbt|fbs/,
        id: { include: /\/src\/.*\.tsx?(\?.*)?$/, exclude: /\/node_modules\// },
      },
      handler(code, id) {
        const filename = id.split("?", 1)[0] ?? id;
        const result = transformSync(id, code, {
          lang: filename.endsWith(".tsx") ? "tsx" : "ts",
          sourcemap: true,
          sourceType: "module",
        });
        if (result.errors.length > 0) {
          throw new Error(result.errors.map(({ message }) => message).join("\n"));
        }
        return { code: result.code, map: result.map };
      },
    },
  };
}

export default defineConfig({
  base: MOUNT_PATH,
  server: {
    host: "0.0.0.0",
    allowedHosts: [".onamp.dev", ".amp.jfa.dev", ".e2b.app"],
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    fbtee(),
    viteReact({ compiler: true }),
    sharedFonts(),
    pwaManifest({
      name: "KEWEKE by JFA",
      shortName: "KEWEKE",
      description: packageTagline("/keweke"),
    }),
    siteMeta({
      title: "KEWEKE by JFA",
      description: packageTagline("/keweke"),
      viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
      pwa: true,
    }),
    sitemap(),
  ],
  optimizeDeps: {
    exclude: ["cloudflare:workers"],
  },
  build: {
    rolldownOptions: {
      external: ["cloudflare:workers"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    tsconfigPaths: true,
  },
  fmt: {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    endOfLine: "lf",
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    insertFinalNewline: true,
    sortPackageJson: {
      sortScripts: true,
    },
    sortImports: {
      order: "asc",
      newlinesBetween: true,
      internalPattern: ["@/"],
      sortSideEffects: false,
      groups: [
        ["builtin"],
        ["external", "type-external"],
        ["internal", "type-internal"],
        ["parent", "type-parent"],
        ["sibling", "type-sibling"],
        ["index", "type-index"],
        ["unknown"],
      ],
    },
    sortTailwindcss: {
      stylesheet: "./src/styles/globals.css",
      attributes: ["class", "className"],
      functions: ["cn", "cva"],
      preserveDuplicates: false,
      preserveWhitespace: false,
    },
    ignorePatterns: [
      "src/routeTree.gen.ts",
      "src/translations/**",
      "translations/**",
      "node_modules/**",
      "bun.lock",
    ],
  },
  lint: {
    plugins: ["eslint", "react", "typescript", "jsx-a11y", "unicorn", "oxc", "import", "promise"],
    jsPlugins: [{ name: "anti-slop", specifier: "../../tools/oxlint/anti-slop/index.ts" }],
    categories: {
      correctness: "error",
      suspicious: "warn",
    },
    env: {
      browser: true,
      ESNext: true,
    },
    ignorePatterns: ["*.d.ts", "**/*.d.ts", "public/**"],
    rules: {
      "typescript/no-explicit-any": "error",
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-return": "error",
      "no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          caughtErrors: "all",
          ignoreRestSiblings: false,
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "eslint/no-underscore-dangle": ["warn", { allow: ["_tag"] }],
      "no-undef": "error",
      "no-unreachable": "error",
      "no-dupe-keys": "error",
      "no-eval": "error",
      "no-debugger": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-var": "error",
      "no-unused-expressions": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      curly: ["error", "all"],
      "prefer-const": ["error", { destructuring: "all" }],
      "import/no-duplicates": "error",
      "import/no-cycle": "error",
      "import/no-self-import": "error",
      "react/jsx-key": "error",
      "react/jsx-no-undef": "error",
      "react/react-in-jsx-scope": "off",
      "react/no-danger": "error",
      // fbtee's <fbt:param>, <fbt:plural> and friends are namespaced JSX by design.
      "react/no-namespace": "off",
      "typescript/no-implied-eval": "error",
      "typescript/no-unsafe-type-assertion": "off",
      "typescript/no-unnecessary-type-assertion": "warn",
      "anti-slop/no-chained-type-assertions": "error",
      "anti-slop/no-conditional-empty-object-spread": "error",
      "anti-slop/no-known-value-widening": "error",
      "anti-slop/no-module-mocking": "error",
      "anti-slop/no-object-parameters": "error",
      "anti-slop/no-reflect-apply": "error",
      "anti-slop/no-reflect-get": "error",
      "anti-slop/no-runtime-typeof": "error",
      "anti-slop/no-shape-in-symbol-names": "error",
      "anti-slop/no-unknown-parameters": "error",
      "anti-slop/no-unknown-returns": "error",
      "anti-slop/no-unknown-type-aliases": "error",
      "anti-slop/no-unsafe-dictionary-type": "error",
      "anti-slop/no-widen-then-assert": "error",
      "anti-slop/require-safety-comment-for-type-assertion": "error",
    },
    options: {
      typeAware: true,
    },
  },
});
