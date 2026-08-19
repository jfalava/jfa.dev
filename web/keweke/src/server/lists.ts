import { listAliasSchema } from "@jfa.dev/common/aliases";
import { aliasSigningPayload, listPublishSigningPayload } from "@jfa.dev/common/crypto";
import { identityAuthSchema, publishAuthSchema } from "@jfa.dev/common/identities";
import { listIdSchema, listMutationSchema, listSnapshotSchema } from "@jfa.dev/common/lists";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { isUuidV7, normalizeListAddress } from "@/lib/list-id";
import { listShareMetaFromSnapshot, type ListShareMeta } from "@/lib/share-meta";

import { readRemoteList, resolveActorNames, resolveHistoryActorNames } from "./remote-list";

const ALIAS_DIRECTORY_NAME = "directory";

const remoteMutationInputSchema = z.object({
  listId: listIdSchema,
  mutation: listMutationSchema,
});

const remoteImportInputSchema = z.object({
  listId: listIdSchema,
  snapshot: listSnapshotSchema,
  migrationId: z.string().min(1).max(128),
  auth: publishAuthSchema,
});

const remoteAliasInputSchema = z.object({
  listId: listIdSchema,
  auth: identityAuthSchema,
});

const remoteItemHistoryInputSchema = z.object({
  listId: listIdSchema,
  itemId: z.string().min(1).max(128),
  limit: z.number().int().min(1).max(100).optional(),
  beforeRevision: z.number().int().min(0).optional(),
});

export const getRemoteList = createServerFn()
  .validator(listIdSchema)
  .handler(async ({ data }) => readRemoteList(data));

export const getRemoteListByAlias = createServerFn()
  .validator(listAliasSchema)
  .handler(async ({ data }) => {
    const listId = await env.KEWEKE_ALIASES.getByName(ALIAS_DIRECTORY_NAME).getListId(data);
    return listId ? readRemoteList(listId) : null;
  });

export const getRemoteItemHistory = createServerFn()
  .validator(remoteItemHistoryInputSchema)
  .handler(async ({ data }) => {
    const result = await env.KEWEKE_LISTS.getByName(data.listId).getItemHistory(data.listId, {
      itemId: data.itemId,
      limit: data.limit,
      beforeRevision: data.beforeRevision,
    });
    if (result.status === "missing") {
      return { status: "missing" as const };
    }
    return { status: "ok" as const, page: await resolveHistoryActorNames(result.page) };
  });

const listShareMetaInputSchema = z.string().trim().min(1).max(200);

export const getListShareMeta = createServerFn()
  .validator(listShareMetaInputSchema)
  .handler(async ({ data }): Promise<ListShareMeta | null> => {
    const normalizedAddress = normalizeListAddress(data);
    const listId = isUuidV7(normalizedAddress)
      ? normalizedAddress
      : await env.KEWEKE_ALIASES.getByName(ALIAS_DIRECTORY_NAME).getListId(normalizedAddress);
    if (!listId) {
      return null;
    }

    const snapshot = await env.KEWEKE_LISTS.getByName(listId).getSnapshot(listId);
    return snapshot ? listShareMetaFromSnapshot(snapshot) : null;
  });

export const ensureRemoteListAlias = createServerFn({ method: "POST" })
  .validator(remoteAliasInputSchema)
  .handler(async ({ data }) => {
    const listStub = env.KEWEKE_LISTS.getByName(data.listId);
    const snapshot = await listStub.getSnapshot(data.listId);
    if (!snapshot) {
      return { status: "missing" as const };
    }

    const authorized = await env.KEWEKE_USERS.getByName(data.auth.userId).authorizeMutation({
      auth: data.auth,
      payload: aliasSigningPayload({
        listId: data.listId,
        userId: data.auth.userId,
        deviceId: data.auth.deviceId,
      }),
    });
    if (!authorized) {
      return { status: "unauthorized" as const };
    }

    const reservation = await env.KEWEKE_ALIASES.getByName(ALIAS_DIRECTORY_NAME).reserveAlias(
      data.listId,
      snapshot.title,
    );
    const updated = await listStub.setAlias(data.listId, reservation.alias);
    if (!updated) {
      throw new Error("List disappeared while assigning its alias");
    }

    try {
      await env.KEWEKE_USERS.getByName(data.auth.userId).recordListTouched(data.listId);
    } catch (error) {
      console.error("Keweke list alias index update failed", {
        error,
        listId: data.listId,
        userId: data.auth.userId,
      });
    }

    return {
      status: reservation.status,
      snapshot: await resolveActorNames(listSnapshotSchema.parse(updated)),
    };
  });

export const applyRemoteMutation = createServerFn({ method: "POST" })
  .validator(remoteMutationInputSchema)
  .handler(async ({ data }) => {
    const result = await env.KEWEKE_LISTS.getByName(data.listId).applyMutation(
      data.listId,
      data.mutation,
    );
    if (result.status === "missing") {
      return { status: "missing" as const };
    }
    if (result.status === "unauthorized") {
      return { status: "unauthorized" as const };
    }
    return {
      status: result.status,
      snapshot: await resolveActorNames(listSnapshotSchema.parse(result.snapshot)),
    };
  });

export const importRemoteList = createServerFn({ method: "POST" })
  .validator(remoteImportInputSchema)
  .handler(async ({ data }) => {
    const payload = listPublishSigningPayload({
      listId: data.listId,
      migrationId: data.migrationId,
      snapshot: data.snapshot,
      userId: data.auth.userId,
      deviceId: data.auth.deviceId,
      username: data.auth.username,
    });
    const authorized = await env.KEWEKE_USERS.getByName(data.auth.userId).authorizePublish({
      auth: data.auth,
      payload,
    });
    if (authorized.status === "unauthorized") {
      return { status: "unauthorized" as const };
    }

    const listStub = env.KEWEKE_LISTS.getByName(data.listId);
    const current = await listStub.getSnapshot(data.listId);
    if (current) {
      return {
        status: "conflict" as const,
        snapshot: await resolveActorNames(listSnapshotSchema.parse(current)),
      };
    }

    if (data.snapshot.alias) {
      const claim = await env.KEWEKE_ALIASES.getByName(ALIAS_DIRECTORY_NAME).claimAlias(
        data.listId,
        data.snapshot.alias,
      );
      if (claim.status === "conflict") {
        return { status: "alias-conflict" as const, snapshot: data.snapshot };
      }
    }

    const result = await listStub.importSnapshot(
      data.listId,
      data.snapshot,
      data.migrationId,
      data.auth,
      payload,
    );
    if (result.status === "unauthorized") {
      return { status: "unauthorized" as const };
    }
    return {
      status: result.status,
      snapshot: await resolveActorNames(listSnapshotSchema.parse(result.snapshot)),
    };
  });
