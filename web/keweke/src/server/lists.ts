import { listAliasSchema } from "@jfa.dev/common/aliases";
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
});

const remoteAliasInputSchema = z.object({
  listId: listIdSchema,
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
      snapshot: listSnapshotSchema.parse(updated),
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
    return { status: result.status, snapshot: listSnapshotSchema.parse(result.snapshot) };
  });

export const importRemoteList = createServerFn({ method: "POST" })
  .validator(remoteImportInputSchema)
  .handler(async ({ data }) => {
    const listStub = env.KEWEKE_LISTS.getByName(data.listId);
    const current = await listStub.getSnapshot(data.listId);
    if (current) {
      return { status: "conflict" as const, snapshot: listSnapshotSchema.parse(current) };
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

    const result = await listStub.importSnapshot(data.listId, data.snapshot, data.migrationId);
    return {
      status: result.status,
      snapshot: listSnapshotSchema.parse(result.snapshot),
    };
  });

async function readRemoteList(listId: string) {
  const snapshot = await env.KEWEKE_LISTS.getByName(listId).getSnapshot(listId);
  if (!snapshot) {
    return null;
  }

  const alias = await env.KEWEKE_ALIASES.getByName(ALIAS_DIRECTORY_NAME).getAlias(listId);
  return listSnapshotSchema.parse({ ...snapshot, alias: alias ?? snapshot.alias });
}
