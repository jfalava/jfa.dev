import {
  deviceRevocationSigningPayload,
  exportPublicKey,
  generateEd25519KeyPair,
  listDeletionSigningPayload,
  listMutationSigningPayload,
  listPublishSigningPayload,
  pairingApprovalSigningPayload,
  publicKeyFingerprint,
  signPayload,
  userDeleteSigningPayload,
  userCreateSigningPayload,
  userListsSigningPayload,
} from "@jfa.dev/common/crypto";
import type { PublishAuth } from "@jfa.dev/common/identities";
import {
  createStarterListSnapshot,
  listLiveMessageSchema,
  type ListCommand,
  type ListMutation,
} from "@jfa.dev/common/lists";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { KewekeList } from "../src/features/lists/server/keweke-list";

const LIST_ID = "019c5f7e-7b7b-7000-8000-000000000020";
const SECOND_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000021";
const THIRD_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000022";
const FOURTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000023";
const FIFTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000024";
const SIXTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000025";
const SEVENTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000026";
const EIGHTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000027";
const NINTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000028";
const TENTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000029";
const ELEVENTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000030";
const TWELFTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000031";
const THIRTEENTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000032";
const HISTORY_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000033";
const NOW = "2026-08-14T10:00:00.000Z";
const UNSIGNED_SIGNATURE = "unsigned-signature-placeholder";

type TestIdentity = {
  userId: string;
  userPublicKey: string;
  userPrivateKey: CryptoKey;
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
    userPrivateKey: userKeys.privateKey,
    deviceId: await publicKeyFingerprint(devicePublicKey),
    devicePublicKey,
    devicePrivateKey: deviceKeys.privateKey,
    username,
  };
}

async function publish(identity: TestIdentity, listId: string) {
  const snapshot = createStarterListSnapshot(listId, { now: NOW });
  const migrationId = `migration:${listId}`;
  const unsignedAuth = {
    userId: identity.userId,
    deviceId: identity.deviceId,
    userPublicKey: identity.userPublicKey,
    devicePublicKey: identity.devicePublicKey,
    username: identity.username,
    signature: UNSIGNED_SIGNATURE,
  } satisfies PublishAuth;
  const signature = await signPayload(
    identity.devicePrivateKey,
    listPublishSigningPayload({
      listId,
      migrationId,
      snapshot,
      userId: identity.userId,
      deviceId: identity.deviceId,
      username: identity.username,
    }),
  );
  const auth = { ...unsignedAuth, signature };
  const userStub = env.KEWEKE_USERS.getByName(identity.userId);
  const authorization = await userStub.authorizePublish({
    auth,
    payload: listPublishSigningPayload({
      listId,
      migrationId,
      snapshot,
      userId: identity.userId,
      deviceId: identity.deviceId,
      username: identity.username,
    }),
  });
  expect(authorization.status).toBe("authorized");

  const listStub = env.KEWEKE_LISTS.getByName(listId);
  const imported = await runInDurableObject(listStub, (instance: KewekeList) =>
    instance.importSnapshot(
      listId,
      snapshot,
      migrationId,
      auth,
      listPublishSigningPayload({
        listId,
        migrationId,
        snapshot,
        userId: identity.userId,
        deviceId: identity.deviceId,
        username: identity.username,
      }),
    ),
  );
  expect(imported.status).toBe("imported");
  return { auth, listStub, snapshot, migrationId };
}

async function signedMutation(
  identity: TestIdentity,
  snapshot: { id: string; revision: number },
  command: ListCommand,
  username = identity.username,
  userId = identity.userId,
): Promise<ListMutation> {
  const unsigned: ListMutation = {
    id: crypto.randomUUID(),
    baseRevision: snapshot.revision,
    actor: { id: userId, username },
    auth: {
      userId,
      deviceId: identity.deviceId,
      signature: UNSIGNED_SIGNATURE,
    },
    command,
  };
  const signature = await signPayload(
    identity.devicePrivateKey,
    listMutationSigningPayload(unsigned),
  );
  return { ...unsigned, auth: { ...unsigned.auth!, signature } };
}

async function signedUserListsAuth(identity: TestIdentity) {
  const auth = {
    userId: identity.userId,
    deviceId: identity.deviceId,
    signature: UNSIGNED_SIGNATURE,
  };
  const signature = await signPayload(
    identity.devicePrivateKey,
    userListsSigningPayload({ userId: auth.userId, deviceId: auth.deviceId }),
  );
  return { ...auth, signature };
}

async function signedListDeletionAuth(identity: TestIdentity, listId: string) {
  const payload = listDeletionSigningPayload({
    listId,
    userId: identity.userId,
    deviceId: identity.deviceId,
  });
  return {
    auth: {
      userId: identity.userId,
      deviceId: identity.deviceId,
      signature: await signPayload(identity.devicePrivateKey, payload),
    },
    payload,
  };
}

type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

function nextLiveMessage(socket: WebSocket): Promise<JsonValue> {
  return new Promise((resolve) => {
    socket.addEventListener(
      "message",
      (event) => {
        if (Object.prototype.toString.call(event.data) === "[object String]") {
          // SAFETY: The test caller validates the received message with the list schema before use.
          resolve(JSON.parse(event.data) as JsonValue);
        }
      },
      { once: true },
    );
  });
}

describe("public-key list authorization", () => {
  it("creates a remote user without publishing a list", async () => {
    const identity = await createIdentity("Remote-only user");
    const payload = userCreateSigningPayload({
      userId: identity.userId,
      deviceId: identity.deviceId,
      userPublicKey: identity.userPublicKey,
      devicePublicKey: identity.devicePublicKey,
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
    const user = env.KEWEKE_USERS.getByName(identity.userId);

    const created = await user.createUser({ auth, payload });
    expect(created.status).toBe("created");
    if (created.status !== "created") {
      return;
    }
    expect(created.profile).toMatchObject({
      userId: identity.userId,
      username: identity.username,
      devices: [
        expect.objectContaining({
          deviceId: identity.deviceId,
          publicKey: identity.devicePublicKey,
          revokedAt: null,
        }),
      ],
    });

    const retry = await user.createUser({ auth, payload });
    expect(retry.status).toBe("existing");
  });

  it("registers a named user, imports a list, and applies signed mutations idempotently", async () => {
    const identity = await createIdentity("Alex");
    const { listStub, snapshot } = await publish(identity, LIST_ID);
    const mutation = await signedMutation(identity, snapshot, {
      type: "set-item-checked",
      itemId: "starter-bread",
      checked: true,
    });

    const applied = await listStub.applyMutation(LIST_ID, mutation);
    expect(applied.status).toBe("ok");
    if (applied.status !== "ok") {
      return;
    }
    expect(applied.snapshot.items[0]?.updatedBy).toEqual({
      id: identity.userId,
      username: "Alex",
    });

    const retry = await listStub.applyMutation(LIST_ID, mutation);
    const stale = await listStub.applyMutation(
      LIST_ID,
      await signedMutation(
        identity,
        { ...snapshot, revision: 0 },
        {
          type: "set-item-checked",
          itemId: "starter-tomatoes",
          checked: true,
        },
      ),
    );
    expect(retry.status).toBe("ok");
    expect(stale.status).toBe("conflict");
  });

  it("persists every mutation command incrementally and round-trips through getSnapshot", async () => {
    const identity = await createIdentity("Delta");
    const { listStub, snapshot } = await publish(identity, TWELFTH_LIST_ID);
    let expected = snapshot;

    const apply = async (command: ListCommand) => {
      const applied = await listStub.applyMutation(
        TWELFTH_LIST_ID,
        await signedMutation(identity, expected, command),
      );
      expect(applied.status).toBe("ok");
      if (applied.status !== "ok") {
        return null;
      }
      expected = applied.snapshot;
      expect(await listStub.getSnapshot(TWELFTH_LIST_ID)).toEqual(expected);
      return applied.snapshot;
    };

    await apply({
      type: "add-item",
      item: {
        id: "delta-milk",
        name: "Milk",
        quantity: 2,
        unit: "EA",
        amount: "",
        category: "DAIRY",
      },
    });
    await apply({
      type: "update-item",
      itemId: "delta-milk",
      changes: { name: "Oat milk", quantity: 3 },
    });
    await apply({ type: "set-item-checked", itemId: "delta-milk", checked: true });
    await apply({ type: "rename-list", title: "Delta list" });

    const removed = await apply({ type: "remove-item", itemId: "delta-milk" });
    const archiveId = removed?.deletedItems[0]?.archiveId ?? "";
    expect(archiveId).not.toBe("");

    const restored = await apply({ type: "restore-item", archiveId });
    expect(restored?.deletedItems).toEqual([]);
    expect(restored?.items.some((item) => item.id === "delta-milk")).toBe(true);

    const removedAgain = await apply({ type: "remove-item", itemId: "delta-milk" });
    const purgeArchiveId = removedAgain?.deletedItems[0]?.archiveId ?? "";
    const purged = await apply({ type: "purge-deleted-item", archiveId: purgeArchiveId });
    expect(purged?.deletedItems).toEqual([]);
    expect(purged?.items.some((item) => item.id === "delta-milk")).toBe(false);

    expect(await listStub.getSnapshot(TWELFTH_LIST_ID)).toEqual(expected);
  });

  it("streams the current snapshot and committed updates to live sessions", async () => {
    const identity = await createIdentity("Live viewer");
    const { listStub, snapshot } = await publish(identity, NINTH_LIST_ID);
    const response = await listStub.fetch(`https://example.com/api/lists/${NINTH_LIST_ID}/live`, {
      headers: { Upgrade: "websocket" },
    });
    expect(response.status).toBe(101);
    expect(response.webSocket).not.toBeNull();
    if (!response.webSocket) {
      return;
    }

    const socket = response.webSocket;
    socket.accept();
    const initial = listLiveMessageSchema.parse(await nextLiveMessage(socket));
    expect(initial).toEqual({ type: "snapshot", snapshot });

    const nextMessage = nextLiveMessage(socket);
    const applied = await listStub.applyMutation(
      NINTH_LIST_ID,
      await signedMutation(identity, snapshot, {
        type: "set-item-checked",
        itemId: "starter-bread",
        checked: true,
      }),
    );
    expect(applied.status).toBe("ok");
    const streamed = listLiveMessageSchema.parse(await nextMessage);
    expect(streamed.type).toBe("mutation");
    if (streamed.type === "mutation") {
      expect(streamed.mutation.baseRevision).toBe(snapshot.revision);
      expect(streamed.mutation.command).toEqual({
        type: "set-item-checked",
        itemId: "starter-bread",
        checked: true,
      });
      expect(streamed.mutation.actor).toEqual({ id: identity.userId, username: "Live viewer" });
      expect(streamed.appliedAt).toBeTypeOf("string");
    }
    socket.close(1000, "done");
  });

  it("indexes lists created and touched by the authenticated user", async () => {
    const owner = await createIdentity("Owner");
    const collaborator = await createIdentity("Collaborator");
    const { listStub: ownerListStub, snapshot: ownerSnapshot } = await publish(
      owner,
      FOURTH_LIST_ID,
    );
    await publish(collaborator, FIFTH_LIST_ID);

    const touched = await ownerListStub.applyMutation(
      FOURTH_LIST_ID,
      await signedMutation(collaborator, ownerSnapshot, {
        type: "set-item-checked",
        itemId: "starter-bread",
        checked: true,
      }),
    );
    expect(touched.status).toBe("ok");

    const auth = await signedUserListsAuth(collaborator);
    const listIds = await env.KEWEKE_USERS.getByName(collaborator.userId).getListIds({
      auth,
      payload: userListsSigningPayload({
        userId: collaborator.userId,
        deviceId: collaborator.deviceId,
      }),
    });
    expect(listIds).not.toBeNull();
    expect(listIds).toEqual(expect.arrayContaining([FOURTH_LIST_ID, FIFTH_LIST_ID]));

    const listIndex = await env.KEWEKE_USERS.getByName(collaborator.userId).getListIndex({
      auth,
      payload: userListsSigningPayload({
        userId: collaborator.userId,
        deviceId: collaborator.deviceId,
      }),
    });
    expect(listIndex).toEqual(
      expect.arrayContaining([
        { listId: FOURTH_LIST_ID, role: "collaborator" },
        { listId: FIFTH_LIST_ID, role: "owner" },
      ]),
    );
  });

  it("rejects an unsigned or unaccepted user-list index read", async () => {
    const identity = await createIdentity("Indexed");
    await publish(identity, SIXTH_LIST_ID);
    const auth = await signedUserListsAuth(identity);
    const userStub = env.KEWEKE_USERS.getByName(identity.userId);
    const payload = userListsSigningPayload({
      userId: identity.userId,
      deviceId: identity.deviceId,
    });

    expect(
      await userStub.getListIds({ auth: { ...auth, signature: UNSIGNED_SIGNATURE }, payload }),
    ).toBeNull();

    const unaccepted = await createIdentity("Unaccepted");
    const unacceptedAuth = await signedUserListsAuth(unaccepted);
    expect(await userStub.getListIds({ auth: unacceptedAuth, payload })).toBeNull();
  });

  it("rejects unsigned and tampered mutations, then rejects a revoked device", async () => {
    const identity = await createIdentity("Sam");
    const { listStub, snapshot } = await publish(identity, SECOND_LIST_ID);
    const command: ListCommand = {
      type: "set-item-checked",
      itemId: "starter-bread",
      checked: true,
    };
    const valid = await signedMutation(identity, snapshot, command);
    const unsigned = await listStub.applyMutation(SECOND_LIST_ID, {
      ...valid,
      auth: null,
    });
    const tampered = await listStub.applyMutation(SECOND_LIST_ID, {
      ...valid,
      command: { ...command, checked: false },
    });
    expect(unsigned.status).toBe("unauthorized");
    expect(tampered.status).toBe("unauthorized");

    const revokePayload = deviceRevocationSigningPayload({
      userId: identity.userId,
      approverDeviceId: identity.deviceId,
      targetDeviceId: identity.deviceId,
    });
    const revokeSignature = await signPayload(identity.devicePrivateKey, revokePayload);
    const revoked = await env.KEWEKE_USERS.getByName(identity.userId).revokeDevice({
      userId: identity.userId,
      approverDeviceId: identity.deviceId,
      targetDeviceId: identity.deviceId,
      signature: revokeSignature,
      payload: revokePayload,
    });
    expect(
      revoked?.devices.find((device) => device.deviceId === identity.deviceId)?.revokedAt,
    ).not.toBeNull();

    expect((await listStub.applyMutation(SECOND_LIST_ID, valid)).status).toBe("unauthorized");
  });

  it("serializes concurrent mutations so only one applies per base revision", async () => {
    const identity = await createIdentity("Concurrent");
    const { listStub, snapshot } = await publish(identity, THIRTEENTH_LIST_ID);

    const first = await signedMutation(identity, snapshot, {
      type: "set-item-checked",
      itemId: "starter-bread",
      checked: true,
    });
    const second = await signedMutation(identity, snapshot, {
      type: "set-item-checked",
      itemId: "starter-tomatoes",
      checked: true,
    });

    const results = await Promise.all([
      listStub.applyMutation(THIRTEENTH_LIST_ID, first),
      listStub.applyMutation(THIRTEENTH_LIST_ID, second),
    ]);

    expect(results.map((result) => result.status).toSorted()).toEqual(["conflict", "ok"]);

    const final = await listStub.getSnapshot(THIRTEENTH_LIST_ID);
    expect(final?.revision).toBe(1);
    const bread = final?.items.find((item) => item.id === "starter-bread");
    const tomatoes = final?.items.find((item) => item.id === "starter-tomatoes");
    expect(Number(bread?.checked) + Number(tomatoes?.checked)).toBe(1);
  });

  it("deletes only created lists, releases aliases, and is idempotent", async () => {
    const owner = await createIdentity("Owner to delete");
    const otherUser = await createIdentity("Other owner");
    const { listStub: keptListStub, snapshot: keptSnapshot } = await publish(
      otherUser,
      SEVENTH_LIST_ID,
    );
    const { listStub: deletedListStub } = await publish(owner, EIGHTH_LIST_ID);
    const aliases = env.KEWEKE_ALIASES.getByName("directory");
    await aliases.claimAlias(SEVENTH_LIST_ID, "kept-list-abcde");
    await aliases.claimAlias(EIGHTH_LIST_ID, "deleted-list-abcde");

    await env.KEWEKE_USERS.getByName(owner.userId).recordListTouched(SEVENTH_LIST_ID);
    expect(await keptListStub.getSnapshot(SEVENTH_LIST_ID)).toEqual(keptSnapshot);
    expect(await aliases.getListId("deleted-list-abcde")).toBe(EIGHTH_LIST_ID);
    expect(await deletedListStub.deleteOwnedList(otherUser.userId)).toEqual({
      status: "unauthorized",
      alias: null,
    });

    const payload = userDeleteSigningPayload({
      userId: owner.userId,
      deviceId: owner.deviceId,
    });
    const result = await env.KEWEKE_USERS.getByName(owner.userId).deleteAccount({
      auth: {
        userId: owner.userId,
        deviceId: owner.deviceId,
        signature: await signPayload(owner.devicePrivateKey, payload),
      },
      payload,
    });

    expect(result).toEqual({ status: "deleted" });
    expect(await deletedListStub.getSnapshot(EIGHTH_LIST_ID)).toBeNull();
    expect(await keptListStub.getSnapshot(SEVENTH_LIST_ID)).toEqual(keptSnapshot);
    expect(await aliases.getListId("deleted-list-abcde")).toBeNull();
    expect(await aliases.getListId("kept-list-abcde")).toBe(SEVENTH_LIST_ID);
    expect(await env.KEWEKE_USERS.getByName(owner.userId).getProfile(owner.userId)).toBeNull();

    const retry = await env.KEWEKE_USERS.getByName(owner.userId).deleteAccount({
      auth: {
        userId: owner.userId,
        deviceId: owner.deviceId,
        signature: "not-used-after-tombstone",
      },
      payload,
    });
    expect(retry).toEqual({ status: "deleted" });
  });

  it("lets collaborators forget a list while owners delete it remotely", async () => {
    const owner = await createIdentity("List owner");
    const collaborator = await createIdentity("List collaborator");
    const { listStub, snapshot } = await publish(owner, TENTH_LIST_ID);
    await publish(collaborator, ELEVENTH_LIST_ID);
    const aliases = env.KEWEKE_ALIASES.getByName("directory");
    await aliases.claimAlias(TENTH_LIST_ID, "forgettable-abcde");

    const touched = await listStub.applyMutation(
      TENTH_LIST_ID,
      await signedMutation(collaborator, snapshot, {
        type: "set-item-checked",
        itemId: "starter-bread",
        checked: true,
      }),
    );
    expect(touched.status).toBe("ok");

    const collaboratorAuth = await signedListDeletionAuth(collaborator, TENTH_LIST_ID);
    const forgotten = await env.KEWEKE_USERS.getByName(collaborator.userId).removeList({
      ...collaboratorAuth,
      listId: TENTH_LIST_ID,
    });
    expect(forgotten).toEqual({ status: "forgotten" });
    expect(await listStub.getSnapshot(TENTH_LIST_ID)).not.toBeNull();

    const collaboratorListsAuth = await signedUserListsAuth(collaborator);
    const collaboratorLists = await env.KEWEKE_USERS.getByName(collaborator.userId).getListIds({
      auth: collaboratorListsAuth,
      payload: userListsSigningPayload({
        userId: collaborator.userId,
        deviceId: collaborator.deviceId,
      }),
    });
    expect(collaboratorLists).not.toContain(TENTH_LIST_ID);

    const ownerAuth = await signedListDeletionAuth(owner, TENTH_LIST_ID);
    const deleted = await env.KEWEKE_USERS.getByName(owner.userId).removeList({
      ...ownerAuth,
      listId: TENTH_LIST_ID,
    });
    expect(deleted).toEqual({ status: "deleted" });
    expect(await listStub.getSnapshot(TENTH_LIST_ID)).toBeNull();
    expect(await aliases.getListId("forgettable-abcde")).toBeNull();
  });

  it("lets an accepted device approve another device, including transitive approval", async () => {
    const identity = await createIdentity("Taylor");
    const { listStub, snapshot } = await publish(identity, THIRD_LIST_ID);
    const target = await createIdentity("unused");
    const code = "AaBbCcDd22";
    const pairing = env.KEWEKE_PAIRING.getByName(code);
    await pairing.start({
      code,
      targetDeviceId: target.deviceId,
      targetDevicePublicKey: target.devicePublicKey,
    });

    const unaccepted = await createIdentity("unused-anonymous");
    const unauthorizedPayload = pairingApprovalSigningPayload({
      code,
      userId: unaccepted.userId,
      approverDeviceId: unaccepted.deviceId,
      targetDeviceId: target.deviceId,
      targetDevicePublicKey: target.devicePublicKey,
    });
    const unauthorized = await pairing.approve({
      code,
      userId: unaccepted.userId,
      approverDeviceId: unaccepted.deviceId,
      targetDeviceId: target.deviceId,
      targetDevicePublicKey: target.devicePublicKey,
      signature: await signPayload(unaccepted.devicePrivateKey, unauthorizedPayload),
      payload: unauthorizedPayload,
    });
    expect(unauthorized).toEqual({ status: "unauthorized", code });

    const approvalPayload = pairingApprovalSigningPayload({
      code,
      userId: identity.userId,
      approverDeviceId: identity.deviceId,
      targetDeviceId: target.deviceId,
      targetDevicePublicKey: target.devicePublicKey,
    });
    const approvalSignature = await signPayload(identity.devicePrivateKey, approvalPayload);
    const approved = await pairing.approve({
      code,
      userId: identity.userId,
      approverDeviceId: identity.deviceId,
      targetDeviceId: target.deviceId,
      targetDevicePublicKey: target.devicePublicKey,
      signature: approvalSignature,
      payload: approvalPayload,
    });
    expect(approved.status).toBe("approved");

    const targetMutation = await signedMutation(
      target,
      snapshot,
      {
        type: "set-item-checked",
        itemId: "starter-tomatoes",
        checked: true,
      },
      "Taylor",
      identity.userId,
    );
    const targetApplied = await listStub.applyMutation(THIRD_LIST_ID, targetMutation);
    expect(targetApplied.status).toBe("ok");

    const transitiveTarget = await createIdentity("unused-again");
    const transitiveCode = "EeFfGgHh33";
    const transitivePairing = env.KEWEKE_PAIRING.getByName(transitiveCode);
    await transitivePairing.start({
      code: transitiveCode,
      targetDeviceId: transitiveTarget.deviceId,
      targetDevicePublicKey: transitiveTarget.devicePublicKey,
    });
    const transitivePayload = pairingApprovalSigningPayload({
      code: transitiveCode,
      userId: identity.userId,
      approverDeviceId: target.deviceId,
      targetDeviceId: transitiveTarget.deviceId,
      targetDevicePublicKey: transitiveTarget.devicePublicKey,
    });
    const transitiveSignature = await signPayload(target.devicePrivateKey, transitivePayload);
    const transitivelyApproved = await transitivePairing.approve({
      code: transitiveCode,
      userId: identity.userId,
      approverDeviceId: target.deviceId,
      targetDeviceId: transitiveTarget.deviceId,
      targetDevicePublicKey: transitiveTarget.devicePublicKey,
      signature: transitiveSignature,
      payload: transitivePayload,
    });
    expect(transitivelyApproved.status).toBe("approved");
  });
});

describe("item mutation history", () => {
  it("records events per item, excludes list-level commands, and paginates newest-first", async () => {
    const identity = await createIdentity("Historian");
    const { listStub, snapshot } = await publish(identity, HISTORY_LIST_ID);
    let revision = snapshot.revision;

    const mutate = async (command: ListCommand) => {
      const mutation = await signedMutation(identity, { id: HISTORY_LIST_ID, revision }, command);
      const result = await listStub.applyMutation(HISTORY_LIST_ID, mutation);
      expect(result.status).toBe("ok");
      revision += 1;
      return mutation;
    };

    await mutate({
      type: "add-item",
      item: {
        id: "history-milk",
        name: "Milk",
        quantity: 1,
        unit: "EA",
        amount: "",
        category: "DAIRY",
      },
    });
    await mutate({ type: "update-item", itemId: "history-milk", changes: { quantity: 2 } });
    await mutate({ type: "set-item-checked", itemId: "history-milk", checked: true });
    await mutate({ type: "rename-list", title: "History list" });
    await mutate({ type: "remove-item", itemId: "history-milk" });

    const afterRemove = await listStub.getSnapshot(HISTORY_LIST_ID);
    expect(afterRemove?.items.find((item) => item.id === "history-milk")).toBeUndefined();
    const archiveId = afterRemove?.deletedItems.find(
      (item) => item.id === "history-milk",
    )?.archiveId;
    expect(archiveId).toBeDefined();
    await mutate({ type: "restore-item", archiveId: archiveId! });

    const missing = await listStub.getItemHistory("019c5f7e-7b7b-7000-8000-000000000099", {
      itemId: "history-milk",
    });
    expect(missing).toEqual({ status: "missing" });

    const full = await listStub.getItemHistory(HISTORY_LIST_ID, { itemId: "history-milk" });
    expect(full.status).toBe("ok");
    if (full.status !== "ok") {
      return;
    }
    // rename-list (revision 4) never touches an item, so no event exists for it.
    expect(full.page.events.map((event) => event.revision)).toEqual([6, 5, 3, 2, 1]);
    expect(full.page.events.map((event) => event.command.type)).toEqual([
      "restore-item",
      "remove-item",
      "set-item-checked",
      "update-item",
      "add-item",
    ]);
    expect(full.page.nextCursor).toBeNull();
    for (const event of full.page.events) {
      expect(event.actor).toMatchObject({ id: identity.userId, username: "Historian" });
      expect(event.mutationId).toEqual(expect.any(String));
      expect(event.appliedAt).toEqual(expect.any(String));
    }

    const firstPage = await listStub.getItemHistory(HISTORY_LIST_ID, {
      itemId: "history-milk",
      limit: 2,
    });
    expect(firstPage.status).toBe("ok");
    if (firstPage.status !== "ok") {
      return;
    }
    expect(firstPage.page.events.map((event) => event.revision)).toEqual([6, 5]);
    expect(firstPage.page.nextCursor).toBe(5);

    const secondPage = await listStub.getItemHistory(HISTORY_LIST_ID, {
      itemId: "history-milk",
      limit: 2,
      beforeRevision: firstPage.page.nextCursor ?? undefined,
    });
    expect(secondPage.status).toBe("ok");
    if (secondPage.status !== "ok") {
      return;
    }
    expect(secondPage.page.events.map((event) => event.revision)).toEqual([3, 2]);
    expect(secondPage.page.nextCursor).toBe(2);

    const lastPage = await listStub.getItemHistory(HISTORY_LIST_ID, {
      itemId: "history-milk",
      limit: 2,
      beforeRevision: secondPage.page.nextCursor ?? undefined,
    });
    expect(lastPage.status).toBe("ok");
    if (lastPage.status !== "ok") {
      return;
    }
    expect(lastPage.page.events.map((event) => event.revision)).toEqual([1]);
    expect(lastPage.page.nextCursor).toBeNull();
  });

  it("keeps history for other items isolated", async () => {
    const identity = await createIdentity("Isolated");
    const { listStub } = await publish(identity, "019c5f7e-7b7b-7000-8000-000000000034");

    const result = await listStub.getItemHistory("019c5f7e-7b7b-7000-8000-000000000034", {
      itemId: "starter-bread",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") {
      return;
    }
    // Starter items arrive via import, not mutations, so no events exist yet.
    expect(result.page.events).toEqual([]);
    expect(result.page.nextCursor).toBeNull();
  });

  it("ignores a duplicate check without bumping the revision or writing history", async () => {
    const identity = await createIdentity("Deduper");
    const listId = "019c5f7e-7b7b-7000-8000-000000000035";
    const { listStub, snapshot } = await publish(identity, listId);

    const duplicate = await listStub.applyMutation(
      listId,
      await signedMutation(identity, snapshot, {
        type: "set-item-checked",
        itemId: "starter-coffee",
        checked: true,
      }),
    );
    expect(duplicate.status).toBe("ok");
    if (duplicate.status !== "ok") {
      return;
    }
    expect(duplicate.snapshot).toEqual(snapshot);

    const history = await listStub.getItemHistory(listId, { itemId: "starter-coffee" });
    expect(history.status).toBe("ok");
    if (history.status !== "ok") {
      return;
    }
    expect(history.page.events).toEqual([]);

    const real = await listStub.applyMutation(
      listId,
      await signedMutation(identity, duplicate.snapshot, {
        type: "set-item-checked",
        itemId: "starter-bread",
        checked: true,
      }),
    );
    expect(real.status).toBe("ok");
    if (real.status !== "ok") {
      return;
    }
    expect(real.snapshot.revision).toBe(snapshot.revision + 1);
  });
});
