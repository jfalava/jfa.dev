import type {
  ApplyMutationResult,
  ImportSnapshotResult,
  ListBackend,
  ListCommand,
  ListMutation,
  ListSnapshot,
} from "@jfa.dev/common/lists";
import { v7 as uuidv7 } from "uuid";

import {
  applyLocalMutation,
  getLocalListRecord,
  markListRemote,
  saveLocalList,
} from "@/lib/local-list-store";
import { applyRemoteMutation, getRemoteList, importRemoteList } from "@/server/lists";

export interface LoadedList {
  backend: ListBackend;
  snapshot: ListSnapshot;
}

export function createMutation(snapshot: ListSnapshot, command: ListCommand): ListMutation {
  return {
    id: uuidv7(),
    baseRevision: snapshot.revision,
    command,
  };
}

function migrationIdForList(listId: string): string {
  return `local-migration:${listId.toLowerCase()}`;
}

export async function loadList(listId: string): Promise<LoadedList | null> {
  const localRecord = await getLocalListRecord(listId);
  if (localRecord?.backend === "local") {
    return { backend: localRecord.backend, snapshot: localRecord.snapshot };
  }

  let remoteSnapshot: ListSnapshot | null;
  try {
    remoteSnapshot = await getRemoteList({ data: listId });
  } catch {
    if (localRecord?.backend === "remote") {
      return { backend: "remote", snapshot: localRecord.snapshot };
    }
    throw new Error("Remote list service is unavailable");
  }

  if (!remoteSnapshot) {
    return localRecord?.backend === "remote"
      ? { backend: "remote", snapshot: localRecord.snapshot }
      : null;
  }

  await markListRemote(remoteSnapshot);
  return { backend: "remote", snapshot: remoteSnapshot };
}

export async function applyMutation(
  listId: string,
  backend: ListBackend,
  mutation: ListMutation,
): Promise<ApplyMutationResult> {
  if (backend === "local") {
    return applyLocalMutation(listId, mutation);
  }

  return applyRemoteMutation({ data: { listId, mutation } });
}

export async function migrateList(
  listId: string,
  snapshot: ListSnapshot,
): Promise<ImportSnapshotResult> {
  const result = await importRemoteList({
    data: {
      listId,
      migrationId: migrationIdForList(listId),
      snapshot,
    },
  });

  if (result.status !== "conflict") {
    await saveLocalList(result.snapshot, "remote");
  }

  return result;
}
