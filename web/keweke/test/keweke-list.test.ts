import {
  deviceRevocationSigningPayload,
  exportPublicKey,
  generateEd25519KeyPair,
  listMutationSigningPayload,
  listPublishSigningPayload,
  pairingApprovalSigningPayload,
  publicKeyFingerprint,
  signPayload,
  userListsSigningPayload,
} from "@jfa.dev/common/crypto";
import type { PublishAuth } from "@jfa.dev/common/identities";
import {
  createStarterListSnapshot,
  type ListCommand,
  type ListMutation,
} from "@jfa.dev/common/lists";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { KewekeList } from "../src/server/keweke-list";

const LIST_ID = "019c5f7e-7b7b-7000-8000-000000000020";
const SECOND_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000021";
const THIRD_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000022";
const FOURTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000023";
const FIFTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000024";
const SIXTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000025";
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

describe("public-key list authorization", () => {
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
