import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  fmt: {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    endOfLine: "lf",
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    insertFinalNewline: true,
    experimentalSortPackageJson: {
      sortScripts: true,
    },
    ignorePatterns: ["node_modules/**", "pnpm-*yaml", "**/routeTree.gen.ts"],
  },
});
