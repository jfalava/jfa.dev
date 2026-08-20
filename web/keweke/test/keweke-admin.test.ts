import {
  exportPublicKey,
  generateEd25519KeyPair,
  listPublishSigningPayload,
  publicKeyFingerprint,
  signPayload,
  userListsSigningPayload,
} from "@jfa.dev/common/crypto";
import type { PublishAuth } from "@jfa.dev/common/identities";
import { createStarterListSnapshot } from "@jfa.dev/common/lists";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const LIST_ID = "019c5f7e-7b7b-7000-8000-000000000040";
const REGISTRY_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000042";
const NOW = "2026-08-14T10:00:00.000Z";

type TestIdentity = {
  userId: string;
  userPublicKey: string;
  deviceId: string;
  devicePublicKey: string;
  devicePrivateKey: CryptoKey;
  username: string;
};

async function createIdentity(username: string): Promise<TestIdentity> {
  const userKeys = await generateEd25519KeyPair();
  const deviceKeys = await generateEd25519KeyPair();
  const userPublicKey = await exportPublicKey(userKeys.publicKey);
  const devicePublicKey = await exportPublicKey(deviceKeys.publicKey);
  return {
    userId: await publicKeyFingerprint(userPublicKey),
    userPublicKey,
    deviceId: await publicKeyFingerprint(devicePublicKey),
    devicePublicKey,
    devicePrivateKey: deviceKeys.privateKey,
    username,
  };
}

describe("KewekeAliasDirectory registry", () => {
  it("tracks registered users and lists idempotently", async () => {
    const directory = env.KEWEKE_ALIASES.getByName("directory");
    const firstUserId = "u".repeat(43);
    const secondUserId = "s".repeat(43);

    await directory.registerUser(firstUserId);
    await directory.registerUser(firstUserId);
    await directory.registerUser(secondUserId);
    expect(await directory.listUserIds()).toContain(firstUserId);
    expect(await directory.listUserIds()).toContain(secondUserId);
    expect((await directory.listUserIds()).filter((userId) => userId === firstUserId)).toHaveLength(
      1,
    );

    await directory.unregisterUser(firstUserId);
    expect(await directory.listUserIds()).not.toContain(firstUserId);
    expect(await directory.listUserIds()).toContain(secondUserId);

    await directory.registerList(REGISTRY_LIST_ID);
    await directory.registerList(REGISTRY_LIST_ID);
    expect(await directory.listListIds()).toContain(REGISTRY_LIST_ID);
    expect(
      (await directory.listListIds()).filter((listId) => listId === REGISTRY_LIST_ID),
    ).toHaveLength(1);

    await directory.unregisterList(REGISTRY_LIST_ID);
    expect(await directory.listListIds()).not.toContain(REGISTRY_LIST_ID);
  });
});

describe("Keweke admin directory flow", () => {
  it("registers users on creation, lists on import, and removes both on deletion", async () => {
    const directory = env.KEWEKE_ALIASES.getByName("directory");
    const identity = await createIdentity("Admin flow user");

    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const migrationId = `migration:${LIST_ID}`;
    const payload = listPublishSigningPayload({
      listId: LIST_ID,
      migrationId,
      snapshot,
      userId: identity.userId,
      deviceId: identity.deviceId,
      username: identity.username,
    });
    const auth = {
      userId: identity.userId,
      deviceId: identity.deviceId,
      userPublicKey: identity.userPublicKey,
      devicePublicKey: identity.devicePublicKey,
      username: identity.username,
      signature: await signPayload(identity.devicePrivateKey, payload),
    } satisfies PublishAuth;

    const authorization = await env.KEWEKE_USERS.getByName(identity.userId).authorizePublish({
      auth,
      payload,
    });
    expect(authorization.status).toBe("authorized");
    expect(await directory.listUserIds()).toContain(identity.userId);

    const imported = await env.KEWEKE_LISTS.getByName(LIST_ID).importSnapshot(
      LIST_ID,
      snapshot,
      migrationId,
      auth,
      payload,
    );
    expect(imported.status).toBe("imported");
    expect(await directory.listListIds()).toContain(LIST_ID);

    const summary = await env.KEWEKE_LISTS.getByName(LIST_ID).getAdminSummary(LIST_ID);
    expect(summary).toMatchObject({
      listId: LIST_ID,
      title: snapshot.title,
      ownerUserId: identity.userId,
    });
    expect(summary?.itemCount).toBeGreaterThan(0);

    const alias = "admin-flow-abcde";
    await directory.claimAlias(LIST_ID, alias);
    await env.KEWEKE_LISTS.getByName(LIST_ID).setAlias(LIST_ID, alias);
    const listPayload = userListsSigningPayload({
      userId: identity.userId,
      deviceId: identity.deviceId,
    });
    const listAuth = {
      userId: identity.userId,
      deviceId: identity.deviceId,
      signature: await signPayload(identity.devicePrivateKey, listPayload),
    };
    expect(
      await env.KEWEKE_USERS.getByName(identity.userId).getListIds({
        auth: listAuth,
        payload: listPayload,
      }),
    ).toContain(LIST_ID);

    const deletion = await env.KEWEKE_LISTS.getByName(LIST_ID).deleteAsAdmin(LIST_ID);
    expect(deletion.status).toBe("deleted");
    expect(await directory.listListIds()).not.toContain(LIST_ID);
    expect(await directory.getListId(alias)).toBeNull();
    expect(await env.KEWEKE_LISTS.getByName(LIST_ID).getAdminSummary(LIST_ID)).toBeNull();
    await env.KEWEKE_USERS.getByName(identity.userId).removeListAsAdmin(LIST_ID);
    expect(
      await env.KEWEKE_USERS.getByName(identity.userId).getListIds({
        auth: listAuth,
        payload: listPayload,
      }),
    ).not.toContain(LIST_ID);

    const accountDeletion = await env.KEWEKE_USERS.getByName(identity.userId).deleteAccountAsAdmin(
      identity.userId,
    );
    expect(accountDeletion.status).toBe("deleted");
    expect(await directory.listUserIds()).not.toContain(identity.userId);
  });
});
