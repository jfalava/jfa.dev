import type {
  ApplyMutationResult,
  ImportSnapshotResult,
  ListBackend,
  ListCommand,
  ListMutation,
  ListSnapshot,
} from "@jfa.dev/common/lists";
import { v7 as uuidv7 } from "uuid";

import { isUuidV7, normalizeListAddress } from "@/lib/list-id";
import {
  applyLocalMutation,
  assignLocalListAlias,
  getLocalListByAlias,
  getLocalListRecord,
  markListRemote,
  saveLocalList,
  type LocalListRecord,
} from "@/lib/local-list-store";
import {
  applyRemoteMutation,
  assignRemoteListAlias,
  getRemoteList,
  getRemoteListByAlias,
  importRemoteList,
} from "@/server/lists";

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

export async function loadList(listAddress: string): Promise<LoadedList | null> {
  const normalizedAddress = normalizeListAddress(listAddress);
  if (!isUuidV7(normalizedAddress)) {
    const localRecord = await getLocalListByAlias(normalizedAddress);
    if (localRecord?.backend === "local") {
      return { backend: localRecord.backend, snapshot: localRecord.snapshot };
    }
    if (localRecord?.backend === "remote") {
      return loadCanonicalList(localRecord.snapshot.id, localRecord);
    }

    try {
      const remoteSnapshot = await getRemoteListByAlias({ data: normalizedAddress });
      if (!remoteSnapshot) {
        return null;
      }
      await markListRemote(remoteSnapshot);
      return { backend: "remote", snapshot: remoteSnapshot };
    } catch {
      throw new Error("Remote list service is unavailable");
    }
  }

  return loadCanonicalList(normalizedAddress);
}

async function loadCanonicalList(
  listId: string,
  cachedRecord?: LocalListRecord,
): Promise<LoadedList | null> {
  const localRecord = cachedRecord ?? (await getLocalListRecord(listId));
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

export async function migrateList(snapshot: ListSnapshot): Promise<ImportSnapshotResult> {
  const result = await importRemoteList({
    data: {
      listId: snapshot.id,
      migrationId: migrationIdForList(snapshot.id),
      snapshot,
    },
  });

  if (result.status !== "conflict" && result.status !== "alias-conflict") {
    await saveLocalList(result.snapshot, "remote");
  }

  return result;
}

export async function assignListAlias(
  backend: ListBackend,
  snapshot: ListSnapshot,
  aliasBase: string,
): Promise<{ status: "created" | "existing"; snapshot: ListSnapshot }> {
  if (backend === "local") {
    const nextSnapshot = await assignLocalListAlias(snapshot.id, aliasBase);
    if (!nextSnapshot) {
      throw new Error("Local list is unavailable");
    }
    return {
      status: snapshot.alias === null ? "created" : "existing",
      snapshot: nextSnapshot,
    };
  }

  const result = await assignRemoteListAlias({
    data: { listId: snapshot.id, aliasBase },
  });
  if (result.status === "missing") {
    throw new Error("This list no longer exists");
  }
  await saveLocalList(result.snapshot, "remote");
  return result;
}
