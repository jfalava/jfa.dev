import {
  deviceForgetSigningPayload,
  deviceRevocationSigningPayload,
  exportPublicKey,
  generateEd25519KeyPair,
  publicKeyFingerprint,
  signPayload,
} from "@jfa.dev/common/crypto";
import type { PublishAuth } from "@jfa.dev/common/identities";
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

describe("device revocation and forgetting", () => {
  it("only forgets a device once it has been revoked, and keeps active devices", async () => {
    const owner = await createIdentity("Owner");
    await createRemoteUser(owner);
    const user = env.KEWEKE_USERS.getByName(owner.userId);

    const other = await createIdentity("Other browser");
    const approvalPayload = `keweke:test-device-approval:${other.deviceId}`;
    const approved = await user.approveDevice({
      userId: owner.userId,
      approverDeviceId: owner.deviceId,
      targetDeviceId: other.deviceId,
      targetDevicePublicKey: other.devicePublicKey,
      signature: await signPayload(owner.devicePrivateKey, approvalPayload),
      payload: approvalPayload,
    });
    expect(approved.status).toBe("approved");

    const activeForgetPayload = deviceForgetSigningPayload({
      userId: owner.userId,
      approverDeviceId: owner.deviceId,
      targetDeviceId: other.deviceId,
    });
    expect(
      await user.forgetDevice({
        userId: owner.userId,
        approverDeviceId: owner.deviceId,
        targetDeviceId: other.deviceId,
        signature: await signPayload(owner.devicePrivateKey, activeForgetPayload),
        payload: activeForgetPayload,
      }),
    ).toBeNull();

    const revokePayload = deviceRevocationSigningPayload({
      userId: owner.userId,
      approverDeviceId: owner.deviceId,
      targetDeviceId: other.deviceId,
    });
    const revoked = await user.revokeDevice({
      userId: owner.userId,
      approverDeviceId: owner.deviceId,
      targetDeviceId: other.deviceId,
      signature: await signPayload(owner.devicePrivateKey, revokePayload),
      payload: revokePayload,
    });
    expect(
      revoked?.devices.find((device) => device.deviceId === other.deviceId)?.revokedAt,
    ).not.toBeNull();

    const forgetPayload = deviceForgetSigningPayload({
      userId: owner.userId,
      approverDeviceId: owner.deviceId,
      targetDeviceId: other.deviceId,
    });
    const forgotten = await user.forgetDevice({
      userId: owner.userId,
      approverDeviceId: owner.deviceId,
      targetDeviceId: other.deviceId,
      signature: await signPayload(owner.devicePrivateKey, forgetPayload),
      payload: forgetPayload,
    });
    expect(forgotten?.devices.map((device) => device.deviceId)).toEqual([owner.deviceId]);
  });

  it("rejects forgetting requests from a device that is no longer active", async () => {
    const owner = await createIdentity("Solo owner");
    await createRemoteUser(owner);
    const user = env.KEWEKE_USERS.getByName(owner.userId);

    const selfRevokePayload = deviceRevocationSigningPayload({
      userId: owner.userId,
      approverDeviceId: owner.deviceId,
      targetDeviceId: owner.deviceId,
    });
    await user.revokeDevice({
      userId: owner.userId,
      approverDeviceId: owner.deviceId,
      targetDeviceId: owner.deviceId,
      signature: await signPayload(owner.devicePrivateKey, selfRevokePayload),
      payload: selfRevokePayload,
    });

    const selfForgetPayload = deviceForgetSigningPayload({
      userId: owner.userId,
      approverDeviceId: owner.deviceId,
      targetDeviceId: owner.deviceId,
    });
    expect(
      await user.forgetDevice({
        userId: owner.userId,
        approverDeviceId: owner.deviceId,
        targetDeviceId: owner.deviceId,
        signature: await signPayload(owner.devicePrivateKey, selfForgetPayload),
        payload: selfForgetPayload,
      }),
    ).toBeNull();
  });
});
