import {
  deviceRevocationSigningPayload,
  pairingApprovalSigningPayload,
  userCreateSigningPayload,
  userDeleteSigningPayload,
  userListsSigningPayload,
  userRenameSigningPayload,
} from "@jfa.dev/common/crypto";
import {
  identityAuthSchema,
  identityIdSchema,
  pairingCodeSchema,
  publicKeySchema,
  publishAuthSchema,
  userProfileSchema,
  usernameSchema,
} from "@jfa.dev/common/identities";
import type { ListSnapshot } from "@jfa.dev/common/lists";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

import type { PairingApprovalStatus, PairingStatus } from "./keweke-pairing";
import type { AccountDeletionResult, RemoteUserCreationResult } from "./keweke-users";
import { readRemoteList } from "./remote-list";

export {
  completePasskeyAdoption,
  completePasskeyRegistration,
  deletePasskey,
  listPasskeys,
  startPasskeyAdoption,
  startPasskeyRegistration,
} from "./passkeys";

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

const userListsInputSchema = z.object({ auth: identityAuthSchema });
const deleteRemoteUserInputSchema = z.object({ auth: identityAuthSchema });
const createRemoteUserInputSchema = z.object({ auth: publishAuthSchema });

export const getUserProfile = createServerFn()
  .validator(identityIdSchema)
  .handler(async ({ data }) => {
    const profile = await env.KEWEKE_USERS.getByName(data).getProfile(data);
    return profile ? userProfileSchema.parse(profile) : null;
  });

export const createRemoteUser = createServerFn({ method: "POST" })
  .validator(createRemoteUserInputSchema)
  .handler(async ({ data }): Promise<RemoteUserCreationResult> => {
    const payload = userCreateSigningPayload({
      userId: data.auth.userId,
      deviceId: data.auth.deviceId,
      userPublicKey: data.auth.userPublicKey,
      devicePublicKey: data.auth.devicePublicKey,
      username: data.auth.username,
    });
    const result = await env.KEWEKE_USERS.getByName(data.auth.userId).createUser({
      auth: data.auth,
      payload,
    });
    // SAFETY: The Durable Object returns the RemoteUserCreationResult contract across the server boundary.
    return JSON.parse(JSON.stringify(result)) as RemoteUserCreationResult;
  });

export const getUserLists = createServerFn()
  .validator(userListsInputSchema)
  .handler(async ({ data }) => {
    const payload = userListsSigningPayload({
      userId: data.auth.userId,
      deviceId: data.auth.deviceId,
    });
    const listIds = await env.KEWEKE_USERS.getByName(data.auth.userId).getListIds({
      auth: data.auth,
      payload,
    });
    if (!listIds) {
      return { status: "unauthorized" as const };
    }

    const results = await Promise.all(listIds.map((listId) => readRemoteList(listId)));
    return {
      status: "ok" as const,
      snapshots: results.filter(
        (snapshot): snapshot is ListSnapshot => snapshot !== null,
      ),
      missingListIds: listIds.filter((_, index) => results[index] === null),
    };
  });

export const deleteRemoteUser = createServerFn({ method: "POST" })
  .validator(deleteRemoteUserInputSchema)
  .handler(async ({ data }) => {
    const payload = userDeleteSigningPayload({
      userId: data.auth.userId,
      deviceId: data.auth.deviceId,
    });
    const result = await env.KEWEKE_USERS.getByName(data.auth.userId).deleteAccount({
      auth: data.auth,
      payload,
    });
    // SAFETY: The Durable Object returns the AccountDeletionResult contract across the server boundary.
    return JSON.parse(JSON.stringify(result)) as AccountDeletionResult;
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
  .handler(async ({ data }) => {
    const result = await env.KEWEKE_PAIRING.getByName(data.code).start(data);
    // SAFETY: The Durable Object returns the PairingStatus contract across the server boundary.
    return JSON.parse(JSON.stringify(result)) as PairingStatus;
  });

export const getDevicePairingStatus = createServerFn()
  .validator(pairingStatusInputSchema)
  .handler(async ({ data }) => {
    const result = await env.KEWEKE_PAIRING.getByName(data).getStatus(data);
    // SAFETY: The Durable Object returns the PairingStatus contract across the server boundary.
    return JSON.parse(JSON.stringify(result)) as PairingStatus;
  });

export const approveDevicePairing = createServerFn({ method: "POST" })
  .validator(pairingApprovalInputSchema)
  .handler(async ({ data }) => {
    const payload = pairingApprovalSigningPayload({
      code: data.code,
      userId: data.auth.userId,
      approverDeviceId: data.auth.deviceId,
      targetDeviceId: data.targetDeviceId,
      targetDevicePublicKey: data.targetDevicePublicKey,
    });
    const result = await env.KEWEKE_PAIRING.getByName(data.code).approve({
      code: data.code,
      userId: data.auth.userId,
      approverDeviceId: data.auth.deviceId,
      targetDeviceId: data.targetDeviceId,
      targetDevicePublicKey: data.targetDevicePublicKey,
      signature: data.auth.signature,
      payload,
    });
    // SAFETY: The Durable Object returns the PairingApprovalStatus contract across the server boundary.
    return JSON.parse(JSON.stringify(result)) as PairingApprovalStatus;
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
