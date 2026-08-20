import { describe, expect, test } from "bun:test";

import { userAvatarSeed } from "./blobatar";

describe("user avatar seeds", () => {
  test("appends the chosen username after the user id", () => {
    expect(userAvatarSeed("abcDEF123-xyz_987", "alain00")).toBe("abcDEF123-xyz_987alain00");
  });

  test("uses the user id alone without a username", () => {
    expect(userAvatarSeed("abcDEF123-xyz_987", null)).toBe("abcDEF123-xyz_987");
    expect(userAvatarSeed("abcDEF123-xyz_987", undefined)).toBe("abcDEF123-xyz_987");
    expect(userAvatarSeed("abcDEF123-xyz_987", "")).toBe("abcDEF123-xyz_987");
  });

  test("keeps usernames verbatim", () => {
    expect(userAvatarSeed("abc123", "Anna & Bob")).toBe("abc123Anna & Bob");
  });
});
