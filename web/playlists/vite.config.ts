import { existsSync, readFileSync } from "node:fs";
import path from "path";

import { siteMeta } from "@jfa.dev/common/vite/site-meta";
import { sitemap } from "@jfa.dev/common/vite/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

function loadDevVars(): void {
  const file = path.resolve(import.meta.dirname, "./.dev.vars");
  if (!existsSync(file)) {
    return;
  }
  const raw = readFileSync(file, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDevVars();

const MOUNT_PATH = "/playlists/";

export default defineConfig({
  base: MOUNT_PATH,
  optimizeDeps: {
    exclude: ["cloudflare:workers"],
  },
  build: {
    rolldownOptions: {
      external: ["cloudflare:workers"],
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    viteReact({ compiler: true }),
    sitemap(),
    siteMeta({
      title: "PLAYLISTS by JFA",
      description: "My music taste is SO much better than yours",
      viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
    }),
  ],
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
      functions: ["clsx", "cn", "cva", "twMerge"],
      preserveDuplicates: false,
      preserveWhitespace: false,
    },
    ignorePatterns: ["src/routeTree.gen.ts", "node_modules/**", "bun.lock", "dist/**"],
  },
  lint: {
    plugins: ["eslint", "react", "typescript", "jsx-a11y", "unicorn", "oxc", "import", "promise"],
    env: {
      browser: true,
      ESNext: true,
      node: true,
    },
    jsPlugins: [{ name: "anti-slop", specifier: "../../tools/oxlint/anti-slop/index.ts" }],
    categories: {
      correctness: "error",
      suspicious: "warn",
    },
    ignorePatterns: ["*.d.ts", "**/*.d.ts", "public/**", "dist/**"],
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
      typeCheck: true,
    },
  },
});
