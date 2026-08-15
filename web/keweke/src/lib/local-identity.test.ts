/// <reference types="bun" />

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { ensureLocalIdentity, readLocalIdentity, saveLocalIdentity } from "./local-identity";

const originalWindow = globalThis.window;

function createWindowStub(): Window {
  const values = new Map<string, string>();

  return {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
  } as unknown as Window;
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: createWindowStub(),
  });
});

afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});

describe("local identity storage", () => {
  test("keeps the hidden id stable when the username changes", () => {
    const first = ensureLocalIdentity();
    const updated = saveLocalIdentity("  Alex  ");

    expect(first.id).toMatch(/^[a-z]{5}$/);
    expect(updated).toEqual({ id: first.id, username: "Alex" });
    expect(readLocalIdentity()).toEqual(updated);
  });
});
