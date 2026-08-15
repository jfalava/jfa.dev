/// <reference types="bun" />

// oxlint-disable-next-line import/no-unassigned-import
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  clearLocalIdentityDatabase,
  ensureLocalIdentity,
  readLocalIdentity,
  saveLocalIdentity,
} from "./local-identity";

const originalWindow = globalThis.window;

function createWindowStub(): Window {
  return {
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

afterEach(async () => {
  await clearLocalIdentityDatabase();
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});

describe("public-key local identity storage", () => {
  test("creates one browser identity and persists a display name", async () => {
    const first = await ensureLocalIdentity();

    expect(first).toBeDefined();
    const firstIdentity = first!;
    expect(firstIdentity.userId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(firstIdentity.deviceId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(firstIdentity.username).toBeNull();
    expect(await readLocalIdentity()).toEqual(first);

    const updated = await saveLocalIdentity("  Alex  ");

    expect(updated.userId).toBe(firstIdentity.userId);
    expect(updated.deviceId).toBe(firstIdentity.deviceId);
    expect(updated.username).toBe("Alex");
    expect(await readLocalIdentity()).toEqual(updated);
  });

  test("does not read the previous local-storage identity format", async () => {
    const identity = await ensureLocalIdentity();
    expect(identity?.userId).not.toBe("abcde");
  });
});
