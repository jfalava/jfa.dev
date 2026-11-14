import { describe, expect, test } from "bun:test";

import {
  checkAliasImports,
  checkBrandingCoverage,
  checkCnImports,
  checkForeignPrimitives,
  checkSharedModules,
  checkClassTokens,
  checkReferenceDrift,
  checkThemeTokens,
  compareWithBaseline,
  declaredTokens,
} from "./index.ts";

// Keweke's title editor and Branding's copy of it before ba897de, as the audit found them.
const keweke = {
  file: "web/keweke/src/list-header-controls.tsx",
  text: `<Input className="h-auto min-h-14 min-w-0 flex-1 py-1 font-serif text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:min-h-20 sm:min-w-64 sm:text-6xl md:text-6xl" />`,
};

describe("reference-drift", () => {
  test("flags a Branding copy that kept the old fixed title height", () => {
    const branding = {
      file: "web/branding/src/components/sections/titles-section.tsx",
      text: `const EDIT_TITLE_CLASS_NAME =
  "h-14 min-w-0 flex-1 py-1 font-serif text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:h-20 sm:min-w-64 sm:text-6xl md:text-6xl";`,
    };
    const [violation] = checkReferenceDrift([branding], [keweke]);
    expect(violation.message).toContain("missing h-auto min-h-14 sm:min-h-20");
    expect(violation.message).toContain("only here h-14 sm:h-20");
  });

  test("accepts an exact copy in any order and ignores unrelated class lists", () => {
    const branding = {
      file: "web/branding/src/components/sections/titles-section.tsx",
      text: `<Input className="font-serif h-auto min-h-14 min-w-0 flex-1 py-1 text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:min-h-20 sm:min-w-64 sm:text-6xl md:text-6xl" />
<div className="flex w-full items-center gap-3 rounded-md border p-4" />`,
    };
    expect(checkReferenceDrift([branding], [keweke])).toEqual([]);
  });
});

test("class token rules honour ui-lint-allow on the previous line", () => {
  const text = `{/* ui-lint-allow text-size */}
<Kbd className="text-[10px]" />
<span className="text-[11px] dark:text-amber-500 bg-[#0e1116]" />
<div className="bg-[color-mix(in_oklab,var(--success)_12%,var(--background))]" />`;
  const found = checkClassTokens({ file: "x.tsx", text }).map((v) => [
    v.rule,
    v.line,
  ]);
  expect(found).toEqual([
    ["text-size", 3],
    ["palette-color", 3],
    ["palette-color", 3],
  ]);
});

test("theme-token rejects shared tokens and global literal fonts, not scoped ones", () => {
  const shared = declaredTokens(
    ":root { --primary: oklch(0.5 0.2 277); --font-sans: x; }",
  );
  const css = `:root { --primary: red; --keep-adding-angle: 0deg; }
body { font-family: var(--font-sans); }
html, body { font-family: Pretendard, sans-serif; }
.landing-hero { font-family: Pretendard, sans-serif; }`;
  const found = checkThemeTokens(
    { file: "web/x/src/styles.css", text: css },
    shared,
  );
  expect(found.map((v) => v.line)).toEqual([1, 3]);
});

test("branding-coverage requires one import per shared module", () => {
  const index = `export { Button, buttonVariants } from "./button";
export { Toggle, toggleVariants } from "./toggle";
export { ThemeToggle } from "./theme-toggle";`;
  const branding = [
    {
      file: "b.tsx",
      text: `import { buttonVariants } from "@jfa.dev/common/ui";`,
    },
  ];
  expect(checkBrandingCoverage(index, branding).map((v) => v.file)).toEqual([
    "common/src/components/ui/toggle.tsx",
  ]);
});

test("baseline comparison fails only where a file gained violations", () => {
  const violation = (file: string) => ({
    rule: "text-size" as const,
    file,
    line: 1,
    message: "",
  });
  const { grown, shrunk } = compareWithBaseline(
    [violation("a"), violation("a"), violation("b")],
    {
      "text-size": { a: 2, b: 2 },
      "palette-color": { c: 1 },
    },
  );
  expect(grown).toEqual([]);
  expect(shrunk.map((entry) => entry.file)).toEqual(["b", "c"]);
  expect(compareWithBaseline([violation("a")], {}).grown).toHaveLength(1);
});

test("alias-import flags @/ imports in Common, not scoped packages or relative paths", () => {
  const text = `import { cn } from "@/lib/utils";
import { Button } from "./button";
import { secret } from "@jfa.dev/common/secrets";
const lazy = import("@/hooks/use-thing");`;
  const found = checkAliasImports([
    { file: "common/src/components/ui/x.tsx", text },
  ]);
  expect(found.map((v) => v.line)).toEqual([1, 4]);
});

test("foreign-primitive flags Radix, Base UI and Vaul in code and manifests only", () => {
  const code = {
    file: "web/x/src/a.tsx",
    text: `import * as Dialog from "@radix-ui/react-dialog";
import { Popover } from "@base-ui/react/popover";
import { Drawer } from "vaul";
import { Vaulted } from "vaulted";
import { Button } from "react-aria-components";`,
  };
  const manifest = {
    file: "web/x/package.json",
    text: `{
  "dependencies": {
    "@base-ui/react": "catalog:react",
    "react-aria-components": "catalog:react",
    "notes": "vaul"
  }
}`,
  };
  const found = checkForeignPrimitives([code], [manifest]).map(
    (v) => `${v.file}:${v.line}`,
  );
  expect(found).toEqual([
    "web/x/src/a.tsx:1",
    "web/x/src/a.tsx:2",
    "web/x/src/a.tsx:3",
    "web/x/package.json:3",
  ]);
});

test("shared modules must be exported and used by a product or another shared module", () => {
  const index = `export { Button, buttonVariants } from "./button";
export { ThemeToggle } from "./theme-toggle";
export {
  Dialog,
  DialogTitle,
} from "./dialog";
export { Kbd } from "./kbd";`;
  const ui = (name: string, text = "") => ({
    file: `common/src/components/ui/${name}.tsx`,
    text,
  });
  const modules = [
    ui("button"),
    ui("theme-toggle"),
    ui("site-header", `import { ThemeToggle } from "./theme-toggle";`),
    ui("dialog"),
    ui(
      "kbd",
      "// ui-lint-allow shared-module-use: kept for an upcoming consumer",
    ),
    ui("orphan"),
  ];
  // Branding is not a product, so the dialog example does not count as use.
  const products = [
    {
      file: "web/keweke/src/a.tsx",
      text: `import {\n  buttonVariants,\n} from "@jfa.dev/common/ui";`,
    },
  ];
  const found = checkSharedModules(index, modules, products).map(
    (v) => `${v.rule} ${v.file}`,
  );
  expect(found).toEqual([
    "shared-module-export common/src/components/ui/site-header.tsx",
    "shared-module-export common/src/components/ui/orphan.tsx",
    "shared-module-use common/src/components/ui/dialog.tsx",
  ]);
});

test("cn-import allows only Common's configured cn to import the bare package", () => {
  const generated = {
    file: "common/src/components/ui/separator.tsx",
    text: `import { cn } from "cn"`,
  };
  const configured = {
    file: "common/src/lib/utils.ts",
    text: `import { createCn } from "cn/config";`,
  };
  const app = {
    file: "web/x/src/lib/utils.ts",
    text: `export { cn } from "@jfa.dev/common";`,
  };
  const found = checkCnImports([generated, configured, app]).map((v) => v.file);
  expect(found).toEqual(["common/src/components/ui/separator.tsx"]);
});
