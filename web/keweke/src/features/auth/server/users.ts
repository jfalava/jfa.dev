import {
  deviceForgetSigningPayload,
  deviceRevocationSigningPayload,
  listDeletionSigningPayload,
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
import { listIdSchema, type ListSnapshot } from "@jfa.dev/common/lists";
import { effectValidator } from "@jfa.dev/common/validator";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import * as Schema from "effect/Schema";

import { readRemoteList } from "@/features/lists/server/remote-list";

import type { PairingApprovalStatus, PairingStatus } from "./keweke-pairing";
import type {
  AccountDeletionResult,
  RemoteListRemovalResult,
  RemoteUserCreationResult,
} from "./keweke-users";

export {
  completePasskeyAdoption,
  completePasskeyRegistration,
  deletePasskey,
  listPasskeys,
  startPasskeyAdoption,
  startPasskeyRegistration,
} from "./passkeys";

const pairingStartInputSchema = Schema.Struct({
  code: pairingCodeSchema,
  targetDeviceId: identityIdSchema,
  targetDevicePublicKey: publicKeySchema,
});

const pairingStatusInputSchema = pairingCodeSchema;

const pairingApprovalInputSchema = Schema.Struct({
  code: pairingCodeSchema,
  auth: identityAuthSchema,
  targetDeviceId: identityIdSchema,
  targetDevicePublicKey: publicKeySchema,
});

const renameInputSchema = Schema.Struct({
  auth: identityAuthSchema,
  username: usernameSchema,
});

const revokeInputSchema = Schema.Struct({
  auth: identityAuthSchema,
  targetDeviceId: identityIdSchema,
});

const forgetInputSchema = Schema.Struct({
  auth: identityAuthSchema,
  targetDeviceId: identityIdSchema,
});

const userListsInputSchema = Schema.Struct({ auth: identityAuthSchema });
const remoteListRemovalInputSchema = Schema.Struct({
  listId: listIdSchema,
  auth: identityAuthSchema,
});
const deleteRemoteUserInputSchema = Schema.Struct({ auth: identityAuthSchema });
const createRemoteUserInputSchema = Schema.Struct({ auth: publishAuthSchema });

export const getUserProfile = createServerFn()
  .validator(effectValidator(identityIdSchema))
  .handler(async ({ data }) => {
    const profile = await env.KEWEKE_USERS.getByName(data).getProfile(data);
    return profile ? Schema.decodeUnknownSync(userProfileSchema)(profile) : null;
  });

export const createRemoteUser = createServerFn({ method: "POST" })
  .validator(effectValidator(createRemoteUserInputSchema))
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
  .validator(effectValidator(userListsInputSchema))
  .handler(async ({ data }) => {
    const payload = userListsSigningPayload({
      userId: data.auth.userId,
      deviceId: data.auth.deviceId,
    });
    const listIndex = await env.KEWEKE_USERS.getByName(data.auth.userId).getListIndex({
      auth: data.auth,
      payload,
    });
    if (!listIndex) {
      return { status: "unauthorized" as const };
    }

    const listIds = listIndex.map((entry) => entry.listId);
    const results = await Promise.all(listIds.map((listId) => readRemoteList(listId)));
    return {
      status: "ok" as const,
      snapshots: results.filter((snapshot): snapshot is ListSnapshot => snapshot !== null),
      missingListIds: listIds.filter((_, index) => results[index] === null),
      ownedListIds: listIndex
        .filter((entry) => entry.role === "owner")
        .map((entry) => entry.listId),
    };
  });

export const removeRemoteList = createServerFn({ method: "POST" })
  .validator(effectValidator(remoteListRemovalInputSchema))
  .handler(async ({ data }): Promise<RemoteListRemovalResult> => {
    const payload = listDeletionSigningPayload({
      listId: data.listId,
      userId: data.auth.userId,
      deviceId: data.auth.deviceId,
    });
    return env.KEWEKE_USERS.getByName(data.auth.userId).removeList({
      auth: data.auth,
      listId: data.listId,
      payload,
    });
  });

export const deleteRemoteUser = createServerFn({ method: "POST" })
  .validator(effectValidator(deleteRemoteUserInputSchema))
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
  .validator(effectValidator(renameInputSchema))
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
      ? {
          status: "updated" as const,
          profile: Schema.decodeUnknownSync(userProfileSchema)(profile),
        }
      : { status: "unauthorized" as const };
  });

export const startDevicePairing = createServerFn({ method: "POST" })
  .validator(effectValidator(pairingStartInputSchema))
  .handler(async ({ data }) => {
    const result = await env.KEWEKE_PAIRING.getByName(data.code).start(data);
    // SAFETY: The Durable Object returns the PairingStatus contract across the server boundary.
    return JSON.parse(JSON.stringify(result)) as PairingStatus;
  });

export const getDevicePairingStatus = createServerFn()
  .validator(effectValidator(pairingStatusInputSchema))
  .handler(async ({ data }) => {
    const result = await env.KEWEKE_PAIRING.getByName(data).getStatus(data);
    // SAFETY: The Durable Object returns the PairingStatus contract across the server boundary.
    return JSON.parse(JSON.stringify(result)) as PairingStatus;
  });

export const approveDevicePairing = createServerFn({ method: "POST" })
  .validator(effectValidator(pairingApprovalInputSchema))
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
  .validator(effectValidator(revokeInputSchema))
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
      ? {
          status: "revoked" as const,
          profile: Schema.decodeUnknownSync(userProfileSchema)(profile),
        }
      : { status: "unauthorized" as const };
  });

export const forgetUserDevice = createServerFn({ method: "POST" })
  .validator(effectValidator(forgetInputSchema))
  .handler(async ({ data }) => {
    const payload = deviceForgetSigningPayload({
      userId: data.auth.userId,
      approverDeviceId: data.auth.deviceId,
      targetDeviceId: data.targetDeviceId,
    });
    const profile = await env.KEWEKE_USERS.getByName(data.auth.userId).forgetDevice({
      userId: data.auth.userId,
      approverDeviceId: data.auth.deviceId,
      targetDeviceId: data.targetDeviceId,
      signature: data.auth.signature,
      payload,
    });
    return profile
      ? {
          status: "forgotten" as const,
          profile: Schema.decodeUnknownSync(userProfileSchema)(profile),
        }
      : { status: "unauthorized" as const };
  });
