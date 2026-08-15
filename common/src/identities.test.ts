/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import { listIdentitySchema } from "./identities";

describe("local identity contract", () => {
  test("normalizes usernames and keeps a five-letter identity id", () => {
    expect(
      listIdentitySchema.parse({ id: "abcde", username: "  Alex  " }),
    ).toEqual({
      id: "abcde",
      username: "Alex",
    });
  });

  test("accepts an anonymous identity with a stable id", () => {
    expect(listIdentitySchema.parse({ id: "abcde", username: null })).toEqual({
      id: "abcde",
      username: null,
    });
  });

  test("rejects identity ids that are not five lowercase letters", () => {
    expect(() =>
      listIdentitySchema.parse({ id: "abc12", username: "Alex" }),
    ).toThrow();
  });
});
