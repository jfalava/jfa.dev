/// <reference types="bun" />

// oxlint-disable-next-line import/no-unassigned-import
import "fake-indexeddb/auto";
import { afterEach, describe, expect, test } from "bun:test";

import { clearLocalData, clearRemoteUserData } from "./local-data";
import {
  clearLocalIdentityDatabase,
  ensureLocalIdentity,
  readLocalIdentity,
} from "./local-identity";
import {
  clearLocalListDatabase,
  createLocalList,
  listLocalLists,
  markListRemote,
} from "./local-list-store";

const originalWindow = globalThis.window;

type WindowStub = Pick<Window, "addEventListener" | "dispatchEvent" | "removeEventListener"> & {
  localStorage: Pick<Storage, "clear">;
};

function createWindowStub(localStorage: Pick<Storage, "clear">): WindowStub {
  const windowStub = {
    addEventListener: () => undefined,
    dispatchEvent: () => true,
    localStorage,
    removeEventListener: () => undefined,
  };
  return windowStub;
}

afterEach(async () => {
  await Promise.all([clearLocalIdentityDatabase(), clearLocalListDatabase()]);
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});

describe("local Keweke data", () => {
  test("clears localStorage, identity, and list databases", async () => {
    let clearCalls = 0;
    const localStorageStub = {
      clear: () => {
        clearCalls += 1;
      },
    };
    const localStorage = localStorageStub satisfies Pick<Storage, "clear">;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: createWindowStub(localStorage),
    });

    await ensureLocalIdentity();
    await createLocalList();
    await clearLocalData();

    expect(clearCalls).toBe(1);
    expect(await readLocalIdentity()).toBeUndefined();
    expect(await listLocalLists()).toEqual([]);
  });

  test("clears the remote user and remote lists but keeps local lists", async () => {
    const localList = await createLocalList();
    const remoteList = await createLocalList();
    await markListRemote(remoteList);
    await ensureLocalIdentity();

    await clearRemoteUserData();

    expect(await readLocalIdentity()).toBeUndefined();
    expect((await listLocalLists()).map((list) => list.id)).toEqual([localList.id]);
  });
});
