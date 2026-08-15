import {
  deviceRevocationSigningPayload,
  pairingApprovalSigningPayload,
  userRenameSigningPayload,
} from "@jfa.dev/common/crypto";
import {
  identityAuthSchema,
  identityIdSchema,
  pairingCodeSchema,
  publicKeySchema,
  userProfileSchema,
  usernameSchema,
} from "@jfa.dev/common/identities";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

const pairingStartInputSchema = z.object({
  code: pairingCodeSchema,
  targetDeviceId: identityIdSchema,
  targetDevicePublicKey: publicKeySchema,
});

const pairingStatusInputSchema = pairingCodeSchema;

const pairingApprovalInputSchema = z.object({
  code: pairingCodeSchema,
  auth: identityAuthSchema,
  targetDeviceId: identityIdSchema,
  targetDevicePublicKey: publicKeySchema,
});

const renameInputSchema = z.object({
  auth: identityAuthSchema,
  username: usernameSchema,
});

const revokeInputSchema = z.object({
  auth: identityAuthSchema,
  targetDeviceId: identityIdSchema,
});

export const getUserProfile = createServerFn()
  .validator(identityIdSchema)
  .handler(async ({ data }) => {
    const profile = await env.KEWEKE_USERS.getByName(data).getProfile(data);
    return profile ? userProfileSchema.parse(profile) : null;
  });

export const updateUserProfile = createServerFn({ method: "POST" })
  .validator(renameInputSchema)
  .handler(async ({ data }) => {
    const payload = userRenameSigningPayload({
      userId: data.auth.userId,
      deviceId: data.auth.deviceId,
      username: data.username,
    });
    const profile = await env.KEWEKE_USERS.getByName(data.auth.userId).updateUsername({
      auth: data.auth,
      username: data.username,
      payload,
    });
    return profile
      ? { status: "updated" as const, profile: userProfileSchema.parse(profile) }
      : { status: "unauthorized" as const };
  });

export const startDevicePairing = createServerFn({ method: "POST" })
  .validator(pairingStartInputSchema)
  .handler(({ data }) =>
    env.KEWEKE_PAIRING.getByName(data.code).start(data),
  );

export const getDevicePairingStatus = createServerFn()
  .validator(pairingStatusInputSchema)
  .handler(({ data }) => env.KEWEKE_PAIRING.getByName(data).getStatus(data));

export const approveDevicePairing = createServerFn({ method: "POST" })
  .validator(pairingApprovalInputSchema)
  .handler(({ data }) => {
    const payload = pairingApprovalSigningPayload({
      code: data.code,
      userId: data.auth.userId,
      approverDeviceId: data.auth.deviceId,
      targetDeviceId: data.targetDeviceId,
      targetDevicePublicKey: data.targetDevicePublicKey,
    });
    return env.KEWEKE_PAIRING.getByName(data.code).approve({
      code: data.code,
      userId: data.auth.userId,
      approverDeviceId: data.auth.deviceId,
      targetDeviceId: data.targetDeviceId,
      targetDevicePublicKey: data.targetDevicePublicKey,
      signature: data.auth.signature,
      payload,
    });
  });

export const revokeUserDevice = createServerFn({ method: "POST" })
  .validator(revokeInputSchema)
  .handler(async ({ data }) => {
    const payload = deviceRevocationSigningPayload({
      userId: data.auth.userId,
      approverDeviceId: data.auth.deviceId,
      targetDeviceId: data.targetDeviceId,
    });
    const profile = await env.KEWEKE_USERS.getByName(data.auth.userId).revokeDevice({
      userId: data.auth.userId,
      approverDeviceId: data.auth.deviceId,
      targetDeviceId: data.targetDeviceId,
      signature: data.auth.signature,
      payload,
    });
    return profile
      ? { status: "revoked" as const, profile: userProfileSchema.parse(profile) }
      : { status: "unauthorized" as const };
  });
