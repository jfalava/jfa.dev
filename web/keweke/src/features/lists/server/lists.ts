import { listAliasSchema } from "@jfa.dev/common/aliases";
import { aliasSigningPayload, listPublishSigningPayload } from "@jfa.dev/common/crypto";
import { identityAuthSchema, publishAuthSchema } from "@jfa.dev/common/identities";
import { listIdSchema, listMutationSchema, listSnapshotSchema } from "@jfa.dev/common/lists";
import { effectValidator } from "@jfa.dev/common/validator";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import * as Schema from "effect/Schema";

import { isUuidV7, normalizeListAddress } from "@/features/lists/lib/list-id";
import { listShareMetaFromSnapshot, type ListShareMeta } from "@/features/lists/lib/share-meta";

import { readRemoteList, resolveActorNames, resolveHistoryActorNames } from "./remote-list";

const ALIAS_DIRECTORY_NAME = "directory";

const remoteMutationInputSchema = Schema.Struct({
  listId: listIdSchema,
  mutation: listMutationSchema,
});

const remoteImportInputSchema = Schema.Struct({
  listId: listIdSchema,
  snapshot: listSnapshotSchema,
  migrationId: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
  auth: publishAuthSchema,
});

const remoteAliasInputSchema = Schema.Struct({
  listId: listIdSchema,
  auth: identityAuthSchema,
});

const remoteItemHistoryInputSchema = Schema.Struct({
  listId: listIdSchema,
  itemId: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
  limit: Schema.optional(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(100)),
  ),
  beforeRevision: Schema.optional(Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))),
});

export const getRemoteList = createServerFn()
  .validator(effectValidator(listIdSchema))
  .handler(async ({ data }) => readRemoteList(data));

export const getRemoteListByAlias = createServerFn()
  .validator(effectValidator(listAliasSchema))
  .handler(async ({ data }) => {
    const listId = await env.KEWEKE_ALIASES.getByName(ALIAS_DIRECTORY_NAME).getListId(data);
    return listId ? readRemoteList(listId) : null;
  });

export const getRemoteItemHistory = createServerFn()
  .validator(effectValidator(remoteItemHistoryInputSchema))
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

const listShareMetaInputSchema = Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(200));

export const getListShareMeta = createServerFn()
  .validator(effectValidator(listShareMetaInputSchema))
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
  .validator(effectValidator(remoteAliasInputSchema))
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
      snapshot: await resolveActorNames(Schema.decodeUnknownSync(listSnapshotSchema)(updated)),
    };
  });

export const applyRemoteMutation = createServerFn({ method: "POST" })
  .validator(effectValidator(remoteMutationInputSchema))
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
      snapshot: await resolveActorNames(
        Schema.decodeUnknownSync(listSnapshotSchema)(result.snapshot),
      ),
    };
  });

export const importRemoteList = createServerFn({ method: "POST" })
  .validator(effectValidator(remoteImportInputSchema))
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
        snapshot: await resolveActorNames(Schema.decodeUnknownSync(listSnapshotSchema)(current)),
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
      snapshot: await resolveActorNames(
        Schema.decodeUnknownSync(listSnapshotSchema)(result.snapshot),
      ),
    };
  });
