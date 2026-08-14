import { describe, expect, test } from "bun:test";

import {
  preferenceCookies,
  readPreference,
  removePreference,
  writePreference,
} from "./preferences";

describe("preferences", () => {
  test("uses root-scoped cookies for shared preferences", () => {
    const originalDocument = globalThis.document;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { cookie: "" },
    });

    try {
      writePreference(preferenceCookies.theme, "dark");
      expect(readPreference(preferenceCookies.theme)).toBe("dark");
      removePreference(preferenceCookies.theme);
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
    }
  });
});
