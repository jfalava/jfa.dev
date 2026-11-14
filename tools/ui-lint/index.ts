/**
 * Source checks for the shared JFA UI rules (see the "JFA branding audit" artifact).
 *
 * Violations are counted per rule and file and compared with baseline.json: existing
 * violations are reported, only new ones fail. Silence a deliberate exception with a
 * `ui-lint-allow <rule>` comment on the same or the previous line.
 *
 * Usage: bun tools/ui-lint/index.ts [--all] [--update-baseline] [--root <dir>]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type Rule =
  | "text-size"
  | "palette-color"
  | "theme-token"
  | "branding-coverage"
  | "reference-drift";

export type Violation = {
  rule: Rule;
  file: string;
  line: number;
  message: string;
};

export type SourceFile = { file: string; text: string };

export type Baseline = Partial<Record<Rule, Record<string, number>>>;

/** Branding sections and Docs previews demonstrate app UI; everything else is product code. */
const REFERENCE_PATTERNS = [
  /^web\/branding\/src\/components\/sections\//,
  /^web\/docs\/src\/components\/(keweke|opengraph)\//,
];

/** Shared modules Branding does not need to import directly, with the reason. */
const COVERAGE_EXCLUSIONS: Record<string, string> = {
  "theme-toggle": "rendered inside SiteHeader, which Branding shows live",
};

const ARBITRARY_TEXT_SIZE =
  /(?<![\w-])(?:[\w-]+:)*text-\[\d+(?:\.\d+)?(?:px|rem|em)\]/g;
const PALETTE_COLOR =
  /(?<![\w-])(?:[\w-]+:)*(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|divide|accent|caret|shadow)-(?:(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(?:50|[1-9]00|950)(?:\/\d+)?(?![\w-])|\[(?:#|rgba?\(|hsla?\(|oklch\(|color-mix\()[^\]\s]*\])/g;
const CLASS_TOKEN = /^[!-]?[a-z0-9@*[][\w:!\-[\]().\/%#,=&>*@~+'"]*$/;

function lineAt(text: string, index: number) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

function isAllowed(text: string, line: number, rule: Rule) {
  const lines = text.split("\n");
  const marker = `ui-lint-allow ${rule}`;
  return Boolean(
    lines[line - 1]?.includes(marker) || lines[line - 2]?.includes(marker),
  );
}

export function isReference(file: string) {
  return REFERENCE_PATTERNS.some((pattern) => pattern.test(file));
}

/** color-mix of theme tokens only, such as an opaque tint for a sticky bar, follows the theme. */
function isTokenMix(token: string) {
  const mix = token.indexOf("[color-mix(");
  return mix !== -1 && !/#|rgba?\(|hsla?\(|oklch\(/.test(token.slice(mix + 11));
}

/** Arbitrary font sizes and raw palette colors bypass the shared type roles and tokens. */
export function checkClassTokens({ file, text }: SourceFile) {
  const violations: Violation[] = [];
  const scan = (
    pattern: RegExp,
    rule: Rule,
    message: (match: string) => string,
  ) => {
    for (const match of text.matchAll(pattern)) {
      if (isTokenMix(match[0])) continue;
      const line = lineAt(text, match.index);
      if (!isAllowed(text, line, rule)) {
        violations.push({ rule, file, line, message: message(match[0]) });
      }
    }
  };
  scan(
    ARBITRARY_TEXT_SIZE,
    "text-size",
    (token) =>
      `${token}: use a type role (type-ui, type-compact, type-meta…) or text-xs and up; sub-12px text needs a documented exception`,
  );
  scan(
    PALETTE_COLOR,
    "palette-color",
    (token) =>
      `${token}: use a theme token (primary, success, destructive, muted…)`,
  );
  return violations;
}

/** Custom properties declared by common/src/styles.css. */
export function declaredTokens(css: string) {
  return new Set(
    [...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]),
  );
}

/** Apps inherit the shared theme; they may add scoped variables and fonts, not replace globals. */
export function checkThemeTokens(
  { file, text }: SourceFile,
  sharedTokens: Set<string>,
) {
  const violations: Violation[] = [];
  const css = text.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, " "),
  );
  for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:/g)) {
    const line = lineAt(css, match.index);
    if (sharedTokens.has(match[1]) && !isAllowed(text, line, "theme-token")) {
      violations.push({
        rule: "theme-token",
        file,
        line,
        message: `${match[1]} redefines a shared token from common/src/styles.css`,
      });
    }
  }
  for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = block[1].trim().split(/\s*,\s*/);
    if (!selectors.some((selector) => /^(html|body|:root|\*)$/.test(selector)))
      continue;
    const declaration = /font-family\s*:([^;]*)/.exec(block[2]);
    if (!declaration || declaration[1].includes("var(")) continue;
    const line = lineAt(
      css,
      block.index + block[1].length + 1 + declaration.index,
    );
    if (!isAllowed(text, line, "theme-token")) {
      violations.push({
        rule: "theme-token",
        file,
        line,
        message: `${block[1].trim()} sets a literal font-family; use the shared font tokens or a scoped class`,
      });
    }
  }
  return violations;
}

/** Static strings that look like Tailwind class lists, such as className values and cn/cva args. */
export function classStrings(text: string) {
  const strings: { tokens: string[]; line: number }[] = [];
  for (const match of text.matchAll(/"([^"\n\\]*)"|`([^`$\\]*)`/g)) {
    const tokens = (match[1] ?? match[2]).trim().split(/\s+/);
    if (
      tokens.length >= 5 &&
      tokens.every((token) => CLASS_TOKEN.test(token)) &&
      tokens.some((token) => token.includes("-"))
    ) {
      strings.push({ tokens, line: lineAt(text, match.index) });
    }
  }
  return strings;
}

/**
 * A reference example whose class list nearly matches product code is a hand copy. When the
 * copy is not exact, the reference shows something production no longer does.
 */
export function checkReferenceDrift(
  references: SourceFile[],
  products: SourceFile[],
) {
  const productStrings = products.flatMap(({ file, text }) =>
    classStrings(text).map(({ tokens, line }) => ({
      set: new Set(tokens),
      file,
      line,
    })),
  );
  const violations: Violation[] = [];
  for (const { file, text } of references) {
    for (const { tokens, line } of classStrings(text)) {
      if (isAllowed(text, line, "reference-drift")) continue;
      const set = new Set(tokens);
      let best:
        | { score: number; match: (typeof productStrings)[number] }
        | undefined;
      let exact = false;
      for (const candidate of productStrings) {
        let shared = 0;
        for (const token of set) {
          if (candidate.set.has(token)) shared++;
        }
        if (shared === set.size && shared === candidate.set.size) {
          exact = true;
          break;
        }
        // Dice similarity: one pair of swapped values in a long list still matches.
        const score = (2 * shared) / (set.size + candidate.set.size);
        if (!best || score > best.score) best = { score, match: candidate };
      }
      if (exact || !best || best.score < 0.75) continue;
      const missing = [...best.match.set].filter((token) => !set.has(token));
      const extra = [...set].filter((token) => !best.match.set.has(token));
      violations.push({
        rule: "reference-drift",
        file,
        line,
        message: `differs from ${best.match.file}:${best.match.line}${missing.length ? `; missing ${missing.join(" ")}` : ""}${extra.length ? `; only here ${extra.join(" ")}` : ""}. Reuse the product component or a shared recipe`,
      });
    }
  }
  return violations;
}

/** Every shared UI module needs an executable Branding example or a listed exclusion. */
export function checkBrandingCoverage(
  indexSource: string,
  branding: SourceFile[],
) {
  const imported = new Set(
    branding.flatMap(({ text }) =>
      [
        ...text.matchAll(
          /import\s*\{([^}]*)\}\s*from\s*"@jfa\.dev\/common\/ui"/g,
        ),
      ].flatMap((match) =>
        match[1]
          .split(",")
          .map((name) => name.replace(/^\s*type\s+/, "").trim()),
      ),
    ),
  );
  const violations: Violation[] = [];
  for (const match of indexSource.matchAll(
    /export\s*\{([^}]*)\}\s*from\s*"\.\/([\w-]+)"/g,
  )) {
    const [, names, module] = match;
    if (module in COVERAGE_EXCLUSIONS) continue;
    const exports = names
      .split(",")
      .map((name) => name.replace(/^\s*type\s+/, "").trim())
      .filter(Boolean);
    if (!exports.some((name) => imported.has(name))) {
      violations.push({
        rule: "branding-coverage",
        file: `common/src/components/ui/${module}.tsx`,
        line: 1,
        message: `no Branding section imports ${exports.join(", ")}; add an example or a COVERAGE_EXCLUSIONS entry`,
      });
    }
  }
  return violations;
}

export function countViolations(violations: Violation[]) {
  const counts: Baseline = {};
  for (const { rule, file } of violations) {
    const files = (counts[rule] ??= {});
    files[file] = (files[file] ?? 0) + 1;
  }
  return counts;
}

/** Rule and file pairs whose count grew past the baseline, and pairs that can shrink. */
export function compareWithBaseline(
  violations: Violation[],
  baseline: Baseline,
) {
  const counts = countViolations(violations);
  const grown: { rule: Rule; file: string; count: number; allowed: number }[] =
    [];
  const shrunk: { rule: Rule; file: string; count: number; allowed: number }[] =
    [];
  const rules = new Set([
    ...Object.keys(counts),
    ...Object.keys(baseline),
  ] as Rule[]);
  for (const rule of rules) {
    const files = new Set([
      ...Object.keys(counts[rule] ?? {}),
      ...Object.keys(baseline[rule] ?? {}),
    ]);
    for (const file of files) {
      const count = counts[rule]?.[file] ?? 0;
      const allowed = baseline[rule]?.[file] ?? 0;
      if (count > allowed) grown.push({ rule, file, count, allowed });
      if (count < allowed) shrunk.push({ rule, file, count, allowed });
    }
  }
  return { grown, shrunk };
}

function sortedBaseline(counts: Baseline) {
  const sorted: Baseline = {};
  for (const rule of Object.keys(counts).sort() as Rule[]) {
    const files = counts[rule] ?? {};
    sorted[rule] = Object.fromEntries(
      Object.keys(files)
        .sort()
        .map((file) => [file, files[file]]),
    );
  }
  return sorted;
}

export function lintRepository(root: string) {
  const listed = execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      ":(glob)web/*/src/**",
      "common/src",
    ],
    { cwd: root, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);
  const read = (file: string): SourceFile => ({
    file,
    text: readFileSync(path.join(root, file), "utf8"),
  });
  const scripts = listed
    .filter((file) => /\.tsx?$/.test(file))
    .filter(
      (file) => !/\.(test|spec)\.tsx?$|routeTree\.gen\.ts$|\.d\.ts$/.test(file),
    )
    .map(read);
  const appStyles = listed
    .filter((file) => file.startsWith("web/") && file.endsWith(".css"))
    .map(read);
  const sharedTokens = declaredTokens(read("common/src/styles.css").text);

  return [
    ...scripts.flatMap(checkClassTokens),
    ...appStyles.flatMap((file) => checkThemeTokens(file, sharedTokens)),
    ...checkBrandingCoverage(
      read("common/src/components/ui/index.ts").text,
      scripts.filter(({ file }) => file.startsWith("web/branding/src/")),
    ),
    ...checkReferenceDrift(
      scripts.filter(({ file }) => isReference(file)),
      scripts.filter(({ file }) => !isReference(file)),
    ),
  ];
}

function main(argv: string[]) {
  const rootIndex = argv.indexOf("--root");
  const root =
    rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]);
  const baselinePath = path.join(import.meta.dirname, "baseline.json");
  const violations = lintRepository(root);
  const format = (v: Violation) =>
    `${v.file}:${v.line}  ${v.rule}  ${v.message}`;

  if (argv.includes("--update-baseline")) {
    writeFileSync(
      baselinePath,
      `${JSON.stringify(sortedBaseline(countViolations(violations)), null, 2)}\n`,
    );
    console.warn(
      `ui-lint: baseline records ${violations.length} existing violations`,
    );
    return 0;
  }

  const baseline: Baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  if (argv.includes("--all")) {
    for (const violation of violations) console.warn(format(violation));
  }
  const { grown, shrunk } = compareWithBaseline(violations, baseline);
  for (const { rule, file, count, allowed } of grown) {
    console.error(
      `\n${file}: ${count - allowed} new ${rule} (baseline ${allowed})`,
    );
    for (const violation of violations) {
      if (violation.rule === rule && violation.file === file)
        console.error(`  ${format(violation)}`);
    }
  }
  const byRule = countViolations(violations);
  const summary = Object.entries(byRule)
    .map(
      ([rule, files]) =>
        `${rule} ${Object.values(files).reduce((a, b) => a + b, 0)}`,
    )
    .join(", ");
  console.warn(
    `\nui-lint: ${violations.length} violations (${summary || "none"})`,
  );
  if (shrunk.length) {
    console.warn(
      `ui-lint: ${shrunk.length} baseline entries can shrink; run bun tools/ui-lint/index.ts --update-baseline`,
    );
  }
  if (grown.length) {
    console.error(
      "ui-lint: new violations. Fix them, or mark a deliberate exception with `ui-lint-allow <rule>`.",
    );
    return 1;
  }
  return 0;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
