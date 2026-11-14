import { describe, expect, test } from "bun:test";

import {
  checkBrandingCoverage,
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
