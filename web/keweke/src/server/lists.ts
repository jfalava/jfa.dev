import { listAliasSchema } from "@jfa.dev/common/aliases";
import {
  aliasSigningPayload,
  listPublishSigningPayload,
} from "@jfa.dev/common/crypto";
import { identityAuthSchema, publishAuthSchema } from "@jfa.dev/common/identities";
import { listIdSchema, listMutationSchema, listSnapshotSchema } from "@jfa.dev/common/lists";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

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

export const getRemoteList = createServerFn()
  .validator(listIdSchema)
  .handler(async ({ data }) => readRemoteList(data));

export const getRemoteListByAlias = createServerFn()
  .validator(listAliasSchema)
  .handler(async ({ data }) => {
    const listId = await env.KEWEKE_ALIASES.getByName(ALIAS_DIRECTORY_NAME).getListId(data);
    return listId ? readRemoteList(listId) : null;
  });

export const ensureRemoteListAlias = createServerFn({ method: "POST" })
  .validator(remoteAliasInputSchema)
  .handler(async ({ data }) => {
    const listStub = env.KEWEKE_LISTS.getByName(data.listId);
    const snapshot = await listStub.getSnapshot(data.listId);
    if (!snapshot) {
      return { status: "missing" as const };
    }

    const authorized = await env.KEWEKE_USERS
      .getByName(data.auth.userId)
      .authorizeMutation({
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
    const authorized = await env.KEWEKE_USERS
      .getByName(data.auth.userId)
      .authorizePublish({ auth: data.auth, payload });
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

async function readRemoteList(listId: string) {
  const snapshot = await env.KEWEKE_LISTS.getByName(listId).getSnapshot(listId);
  if (!snapshot) {
    return null;
  }

  const alias = await env.KEWEKE_ALIASES.getByName(ALIAS_DIRECTORY_NAME).getAlias(listId);
  return resolveActorNames(listSnapshotSchema.parse({ ...snapshot, alias: alias ?? snapshot.alias }));
}

async function resolveActorNames(snapshot: ReturnType<typeof listSnapshotSchema.parse>) {
  const userIds = new Set<string>();
  for (const item of snapshot.items) {
    if (item.createdBy) {
      userIds.add(item.createdBy.id);
    }
    if (item.updatedBy) {
      userIds.add(item.updatedBy.id);
    }
  }
  for (const item of snapshot.deletedItems) {
    if (item.createdBy) {
      userIds.add(item.createdBy.id);
    }
    if (item.updatedBy) {
      userIds.add(item.updatedBy.id);
    }
    if (item.deletedBy) {
      userIds.add(item.deletedBy.id);
    }
  }

  const profiles = await Promise.all(
    [...userIds].map(async (userId) => [
      userId,
      await env.KEWEKE_USERS.getByName(userId).getProfile(userId),
    ] as const),
  );
  const usernames = new Map<string, string>();
  for (const [userId, profile] of profiles) {
    if (profile) {
      usernames.set(userId, profile.username);
    }
  }
  const currentIdentity = (identity: { id: string; username: string | null } | null) =>
    identity ? { ...identity, username: usernames.get(identity.id) ?? identity.username } : null;

  return listSnapshotSchema.parse({
    ...snapshot,
    items: snapshot.items.map((item) => ({
      ...item,
      createdBy: currentIdentity(item.createdBy),
      updatedBy: currentIdentity(item.updatedBy),
    })),
    deletedItems: snapshot.deletedItems.map((item) => ({
      ...item,
      createdBy: currentIdentity(item.createdBy),
      updatedBy: currentIdentity(item.updatedBy),
      deletedBy: currentIdentity(item.deletedBy),
    })),
  });
}
