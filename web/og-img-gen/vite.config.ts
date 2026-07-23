import path from "path";

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

/**
 * Vite configuration for the hyperscaler services application.
 * Configures plugins for React, TypeScript paths, Tailwind CSS, TanStack Start, and Cloudflare.
 *
 * @returns Vite configuration object
 */

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
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
    ignorePatterns: [
      "cloudflare-env.d.ts",
      "worker-configuration.d.ts",
      "src/routeTree.gen.ts",
      ".wrangler/**",
      "node_modules/**",
      "bun.lock",
    ],
  },
  lint: {
    plugins: ["eslint", "react", "typescript", "jsx-a11y", "unicorn", "oxc", "import", "promise"],
    categories: {
      correctness: "error",
      suspicious: "warn",
    },
    env: {
      browser: true,
      es2024: true,
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
      "no-undef": "error",
      "no-unreachable": "error",
      "no-dupe-keys": "error",
      "no-dupe-class-members": "error",
      "no-fallthrough": "error",
      "no-duplicate-imports": "error",
      "no-eval": "error",
      "no-debugger": "error",
      "no-console": [
        "error",
        {
          allow: ["warn", "error"],
        },
      ],
      "no-with": "error",
      "no-proto": "error",
      "no-new-wrappers": "error",
      "no-iterator": "error",
      "no-labels": "error",
      "no-var": "error",
      "no-param-reassign": "error",
      "no-extend-native": "error",
      "no-func-assign": "error",
      "no-empty-function": "error",
      "no-extra-bind": "error",
      "no-useless-constructor": "error",
      "no-unused-expressions": "error",
      eqeqeq: [
        "error",
        "always",
        {
          null: "ignore",
        },
      ],
      curly: ["error", "all"],
      "no-implicit-coercion": [
        "error",
        {
          boolean: true,
          number: true,
          string: true,
          disallowTemplateShorthand: true,
        },
      ],
      "prefer-const": [
        "error",
        {
          destructuring: "all",
        },
      ],
      complexity: ["error", 12],
      "max-depth": ["error", 4],
      "max-params": ["error", 5],
      "max-statements": ["error", 40],
      "import/no-duplicates": "error",
      "import/no-mutable-exports": "error",
      "import/no-cycle": "error",
      "import/no-self-import": "error",
      "react/jsx-key": "error",
      "react/jsx-no-undef": "error",
      "react/react-in-jsx-scope": "off",
      "react/no-direct-mutation-state": "error",
      "react/no-find-dom-node": "error",
      "react/no-danger": "error",
      "typescript/no-implied-eval": "error",
      "typescript/no-unsafe-type-assertion": "error",
      "typescript/no-unnecessary-type-assertion": "warn",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
