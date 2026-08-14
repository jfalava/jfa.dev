import { describe, expect, test } from "bun:test";

import { v7 as uuidv7 } from "uuid";

import { isUuidV7, normalizeListId } from "./list-id";

describe("list ids", () => {
  test("accepts UUID7 values", () => {
    expect(isUuidV7(uuidv7())).toBe(true);
  });

  test("rejects non-UUID7 values", () => {
    expect(isUuidV7("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
    expect(isUuidV7("not-a-list")).toBe(false);
  });

  test("normalizes pasted list ids", () => {
    expect(normalizeListId("  0190ABCD-1234-7ABC-8DEF-1234567890AB  ")).toBe(
      "0190abcd-1234-7abc-8def-1234567890ab",
    );
  });
});
