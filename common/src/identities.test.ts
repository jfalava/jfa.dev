/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import { listIdentitySchema, publishAuthSchema } from "./identities";

import * as Schema from "effect/Schema";

const USER_ID = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const DEVICE_ID = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

describe("public-key identity contract", () => {
  test("normalizes display names without changing the fingerprint", () => {
    expect(
      Schema.decodeUnknownSync(listIdentitySchema)({ id: USER_ID, username: "  Alex  " }),
    ).toEqual({
      id: USER_ID,
      username: "Alex",
    });
  });

  test("keeps local anonymous attribution distinct from a named identity", () => {
    expect(Schema.decodeUnknownSync(listIdentitySchema)({ id: USER_ID, username: null })).toEqual({
      id: USER_ID,
      username: null,
    });
  });

  test("requires a full base64url fingerprint and complete publish credentials", () => {
    expect(() =>
      Schema.decodeUnknownSync(listIdentitySchema)({ id: "abcde", username: "Alex" }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(publishAuthSchema)({
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
