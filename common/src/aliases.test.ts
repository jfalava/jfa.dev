/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import {
  createListAlias,
  isListAlias,
  normalizeListAliasBase,
} from "./aliases";

describe("list aliases", () => {
  test("turns a human label into a readable slug with a five-letter suffix", () => {
    expect(normalizeListAliasBase("  Weekend groceries  ")).toBe("weekend-groceries");
    expect(createListAlias("Weekend groceries", new Uint8Array([0, 1, 2, 3, 4]))).toBe(
      "weekend-groceries-abcde",
    );
  });

  test("accepts generated aliases and rejects unfinished labels", () => {
    expect(isListAlias("weekend-groceries-abcde")).toBe(true);
    expect(isListAlias("Weekend groceries")).toBe(false);
    expect(() => normalizeListAliasBase("---")).toThrow();
  });
});
