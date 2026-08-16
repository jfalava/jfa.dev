/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import { listIdentitySchema, publishAuthSchema } from "./identities";

const USER_ID = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const DEVICE_ID = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

describe("public-key identity contract", () => {
  test("normalizes display names without changing the fingerprint", () => {
    expect(listIdentitySchema.parse({ id: USER_ID, username: "  Alex  " })).toEqual({
      id: USER_ID,
      username: "Alex",
    });
  });

  test("keeps local anonymous attribution distinct from a named identity", () => {
    expect(listIdentitySchema.parse({ id: USER_ID, username: null })).toEqual({
      id: USER_ID,
      username: null,
    });
  });

  test("requires a full base64url fingerprint and complete publish credentials", () => {
    expect(() => listIdentitySchema.parse({ id: "abcde", username: "Alex" })).toThrow();
    expect(() =>
      publishAuthSchema.parse({
        userId: USER_ID,
        deviceId: DEVICE_ID,
        signature: "short",
        userPublicKey: "public-user-key",
        devicePublicKey: "public-device-key",
        username: "Alex",
      }),
    ).toThrow();
  });
});
