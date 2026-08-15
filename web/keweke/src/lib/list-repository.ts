import {
  aliasSigningPayload,
  listMutationSigningPayload,
  listPublishSigningPayload,
} from "@jfa.dev/common/crypto";
import type { ListIdentity } from "@jfa.dev/common/identities";
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
  confirmRemoteUsername,
  ensureLocalIdentity,
  signLocalPayload,
  type LocalIdentity,
} from "@/lib/local-identity";
import {
  applyLocalMutation,
  ensureLocalListAlias,
  getLocalListByAlias,
  getLocalListRecord,
  markListRemote,
  saveLocalList,
  type LocalListRecord,
} from "@/lib/local-list-store";
import {
  applyRemoteMutation,
  ensureRemoteListAlias,
  getRemoteList,
  getRemoteListByAlias,
  importRemoteList,
} from "@/server/lists";

export interface LoadedList {
  backend: ListBackend;
  snapshot: ListSnapshot;
}

export async function createMutation(
  snapshot: ListSnapshot,
  command: ListCommand,
  identity?: LocalIdentity,
  backend: ListBackend = "local",
): Promise<ListMutation> {
  const localActor: ListIdentity | null = identity?.username
    ? { id: identity.userId, username: identity.username }
    : null;
  const base = {
    id: uuidv7(),
    baseRevision: snapshot.revision,
    actor: localActor,
    auth: null,
    command,
  };

  if (backend === "local") {
    return base;
  }
  if (!identity?.remoteUsername) {
    throw new Error("Set up a named user before changing a remote list");
  }

  const unsignedMutation: ListMutation = {
    ...base,
    actor: { id: identity.userId, username: identity.remoteUsername },
    auth: {
      userId: identity.userId,
      deviceId: identity.deviceId,
      signature: "unsigned-signature-placeholder",
    },
  };
  const signature = await signLocalPayload(listMutationSigningPayload(unsignedMutation));
  return {
    ...unsignedMutation,
    auth: {
      userId: identity.userId,
      deviceId: identity.deviceId,
      signature,
    },
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
  const identity = await ensureLocalIdentity();
  if (!identity?.username) {
    throw new Error("Set up a username before publishing a list");
  }
  const migrationId = migrationIdForList(snapshot.id);
  const unsignedAuth = {
    userId: identity.userId,
    deviceId: identity.deviceId,
    userPublicKey: identity.userPublicKey,
    devicePublicKey: identity.devicePublicKey,
    username: identity.remoteUsername ?? identity.username,
    signature: "unsigned-signature-placeholder",
  };
  const signature = await signLocalPayload(
    listPublishSigningPayload({
      listId: snapshot.id,
      migrationId,
      snapshot,
      userId: unsignedAuth.userId,
      deviceId: unsignedAuth.deviceId,
      username: unsignedAuth.username,
    }),
  );
  const result = await importRemoteList({
    data: {
      listId: snapshot.id,
      migrationId,
      snapshot,
      auth: { ...unsignedAuth, signature },
    },
  });

  if (result.status === "unauthorized") {
    throw new Error("The remote user could not authorize this publish");
  }
  if (result.status !== "conflict" && result.status !== "alias-conflict") {
    await saveLocalList(result.snapshot, "remote");
  }
  await confirmRemoteUsername(unsignedAuth.username);

  return result;
}

export async function ensureListAlias(
  backend: ListBackend,
  snapshot: ListSnapshot,
): Promise<{ status: "created" | "existing"; snapshot: ListSnapshot }> {
  if (snapshot.alias !== null) {
    return { status: "existing", snapshot };
  }

  if (backend === "local") {
    const nextSnapshot = await ensureLocalListAlias(snapshot.id);
    if (!nextSnapshot) {
      throw new Error("Local list is unavailable");
    }
    return {
      status: "created",
      snapshot: nextSnapshot,
    };
  }

  const identity = await ensureLocalIdentity();
  if (!identity?.remoteUsername) {
    throw new Error("Set up a named user before changing a remote list");
  }
  const authWithoutSignature = {
    userId: identity.userId,
    deviceId: identity.deviceId,
    signature: "unsigned-signature-placeholder",
  };
  const signature = await signLocalPayload(
    aliasSigningPayload({
      listId: snapshot.id,
      userId: authWithoutSignature.userId,
      deviceId: authWithoutSignature.deviceId,
    }),
  );
  const result = await ensureRemoteListAlias({
    data: { listId: snapshot.id, auth: { ...authWithoutSignature, signature } },
  });
  if (result.status === "missing") {
    throw new Error("This list no longer exists");
  }
  if (result.status === "unauthorized") {
    throw new Error("The remote user could not authorize this change");
  }
  await saveLocalList(result.snapshot, "remote");
  return result;
}
