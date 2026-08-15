import {
  passkeyDeleteSigningPayload,
  passkeyListSigningPayload,
  publicKeyFingerprint,
  exportPublicKey,
  generateEd25519KeyPair,
  signPayload,
} from "@jfa.dev/common/crypto";
import type { PasskeyCredential, PublishAuth } from "@jfa.dev/common/identities";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

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

async function createRemoteUser(identity: TestIdentity): Promise<void> {
  const payload = `keweke:test-user-create:${identity.userId}`;
  const auth = {
    userId: identity.userId,
    deviceId: identity.deviceId,
    userPublicKey: identity.userPublicKey,
    devicePublicKey: identity.devicePublicKey,
    username: identity.username,
    signature: await signPayload(identity.devicePrivateKey, payload),
  } satisfies PublishAuth;
  const result = await env.KEWEKE_USERS.getByName(identity.userId).authorizePublish({
    auth,
    payload,
  });
  expect(result.status).toBe("authorized");
}

describe("passkey adoption persistence", () => {
  it("stores one-use registration and adoption sessions", async () => {
    const identity = await createIdentity("Session owner");
    const sessionId = crypto.randomUUID();
    const session = env.KEWEKE_PASSKEY_SESSIONS.getByName(sessionId);

    const first = await session.startRegistration({
      userId: identity.userId,
      deviceId: identity.deviceId,
      devicePublicKey: identity.devicePublicKey,
    });
    expect(first.flow).toBe("registration");
    expect((await session.getSession())?.challenge).toBe(first.challenge);

    const retry = await session.startRegistration({
      userId: identity.userId,
      deviceId: identity.deviceId,
      devicePublicKey: identity.devicePublicKey,
    });
    expect(retry).toEqual(first);
    expect(await session.finish()).toBe(true);
    expect(await session.getSession()).toBeNull();
    expect(await session.finish()).toBe(false);

    const target = await createIdentity("Adoption target");
    const adoption = await session.startAdoption({
      targetDeviceId: target.deviceId,
      targetDevicePublicKey: target.devicePublicKey,
    });
    expect(adoption).toMatchObject({
      flow: "adoption",
      targetDeviceId: target.deviceId,
      targetDevicePublicKey: target.devicePublicKey,
    });
  });

  it("stores, uses, lists, and deletes a passkey credential", async () => {
    const identity = await createIdentity("Passkey owner");
    await createRemoteUser(identity);
    const user = env.KEWEKE_USERS.getByName(identity.userId);
    const credential: PasskeyCredential = {
      id: "credential-1",
      publicKey: "cHVibGljLWtleQ",
      algorithm: "ES256",
      transports: ["internal"],
      counter: 0,
      synced: true,
    };

    expect(await user.registerPasskey({ userId: identity.userId, credential })).toEqual({
      status: "registered",
    });
    expect(
      await user.getPasskeyCredential({
        userId: identity.userId,
        credentialId: credential.id,
      }),
    ).toEqual(credential);
    expect(await user.registerPasskey({ userId: identity.userId, credential })).toEqual({
      status: "existing",
    });

    const target = await createIdentity("New device");
    const approved = await user.approveDeviceByPasskey({
      userId: identity.userId,
      targetDeviceId: target.deviceId,
      targetDevicePublicKey: target.devicePublicKey,
      credentialId: credential.id,
      counter: 7,
    });
    expect(approved.status).toBe("approved");
    if (approved.status !== "approved") {
      return;
    }
    expect(approved.profile.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          deviceId: target.deviceId,
          publicKey: target.devicePublicKey,
          approvedBy: null,
          revokedAt: null,
        }),
      ]),
    );
    expect(
      (
        await user.getPasskeyCredential({
          userId: identity.userId,
          credentialId: credential.id,
        })
      )?.counter,
    ).toBe(7);

    const listPayload = passkeyListSigningPayload({
      userId: identity.userId,
      deviceId: identity.deviceId,
    });
    const list = await user.listPasskeys({
      auth: {
        userId: identity.userId,
        deviceId: identity.deviceId,
        signature: await signPayload(identity.devicePrivateKey, listPayload),
      },
      payload: listPayload,
    });
    expect(list).not.toBeNull();
    if (!list) {
      return;
    }
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: credential.id, synced: true });
    expect(typeof list[0]?.lastUsedAt).toBe("string");

    const deletePayload = passkeyDeleteSigningPayload({
      userId: identity.userId,
      deviceId: identity.deviceId,
      credentialId: credential.id,
    });
    const remaining = await user.deletePasskey({
      auth: {
        userId: identity.userId,
        deviceId: identity.deviceId,
        signature: await signPayload(identity.devicePrivateKey, deletePayload),
      },
      credentialId: credential.id,
      payload: deletePayload,
    });
    expect(remaining).toEqual([]);
    expect(
      await user.getPasskeyCredential({
        userId: identity.userId,
        credentialId: credential.id,
      }),
    ).toBeNull();
  });
});
