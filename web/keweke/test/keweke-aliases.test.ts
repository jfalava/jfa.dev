import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { KewekeAliasDirectory } from "../src/server/keweke-aliases";

const LIST_ID = "019c5f7e-7b7b-7000-8000-000000000030";
const SECOND_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000031";

describe("KewekeAliasDirectory Durable Object", () => {
  it("reserves one readable alias per list and resolves it", async () => {
    const stub = env.KEWEKE_ALIASES.getByName("directory");
    const reserved = await runInDurableObject(stub, (instance: KewekeAliasDirectory) =>
      instance.reserveAlias(LIST_ID, "Weekend groceries"),
    );

    expect(reserved.status).toBe("created");
    expect(reserved.alias).toMatch(/^weekend-groceries-[a-z]{5}$/);
    expect(await stub.getListId(reserved.alias)).toBe(LIST_ID);

    const retry = await stub.reserveAlias(LIST_ID, "A different label");
    expect(retry.status).toBe("existing");
    expect(retry.alias).toBe(reserved.alias);

    const collision = await stub.claimAlias(SECOND_LIST_ID, reserved.alias);
    expect(collision.status).toBe("conflict");
    expect(await stub.getListId(reserved.alias)).toBe(LIST_ID);

    const claimed = await stub.claimAlias(SECOND_LIST_ID, "another-list-abcde");
    expect(claimed.status).toBe("claimed");
    expect(await stub.getListId("another-list-abcde")).toBe(SECOND_LIST_ID);
  });
});
