import { listIdSchema, listMutationSchema, listSnapshotSchema } from "@jfa.dev/common/lists";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

const remoteMutationInputSchema = z.object({
  listId: listIdSchema,
  mutation: listMutationSchema,
});

const remoteImportInputSchema = z.object({
  listId: listIdSchema,
  snapshot: listSnapshotSchema,
  migrationId: z.string().min(1).max(128),
});

export const getRemoteList = createServerFn()
  .validator(listIdSchema)
  .handler(async ({ data }) => {
    const snapshot = await env.KEWEKE_LISTS.getByName(data).getSnapshot(data);
    return snapshot ? listSnapshotSchema.parse(snapshot) : null;
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
    const result = await env.KEWEKE_LISTS.getByName(data.listId).importSnapshot(
      data.listId,
      data.snapshot,
      data.migrationId,
    );
    return {
      status: result.status,
      snapshot: listSnapshotSchema.parse(result.snapshot),
    };
  });
