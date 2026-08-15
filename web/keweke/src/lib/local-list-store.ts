import { createListAlias, listAliasSchema } from "@jfa.dev/common/aliases";
import {
  applyListMutation,
  createListSnapshot,
  parseListMutation,
  parseListSnapshot,
  summarizeList,
  type ApplyMutationResult,
  type ListBackend,
  type ListMutation,
  type ListSnapshot,
  type ListSummary,
} from "@jfa.dev/common/lists";
import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import { v7 as uuidv7 } from "uuid";

const DATABASE_NAME = "keweke-local-lists";
const DATABASE_VERSION = 1;

export interface LocalListRecord {
  id: string;
  backend: ListBackend;
  snapshot: ListSnapshot;
  updatedAt: string;
}

interface KewekeDatabase extends DBSchema {
  lists: {
    key: string;
    value: LocalListRecord;
    indexes: { "by-updated-at": string };
  };
}

let databasePromise: Promise<IDBPDatabase<KewekeDatabase>> | undefined;
const listeners = new Set<() => void>();
const mutationQueues = new Map<string, Promise<ApplyMutationResult>>();

function getDatabase(): Promise<IDBPDatabase<KewekeDatabase>> {
  databasePromise ??= openDB<KewekeDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      const lists = database.createObjectStore("lists", { keyPath: "id" });
      lists.createIndex("by-updated-at", "updatedAt");
    },
  });
  return databasePromise;
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeToLocalLists(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function putRecord(record: LocalListRecord): Promise<void> {
  const database = await getDatabase();
  await database.put("lists", record);
  emitChange();
}

export async function getLocalListRecord(listId: string): Promise<LocalListRecord | undefined> {
  const database = await getDatabase();
  const record = await database.get("lists", listId.toLowerCase());
  return record ? normalizeLocalListRecord(record) : undefined;
}

export async function getLocalListByAlias(alias: string): Promise<LocalListRecord | undefined> {
  const normalizedAlias = listAliasSchema.parse(alias.trim().toLowerCase());
  const database = await getDatabase();
  const records = await database.getAll("lists");
  return records
    .map(normalizeLocalListRecord)
    .find((record) => record.snapshot.alias === normalizedAlias);
}

export async function listLocalLists(): Promise<ListSummary[]> {
  const database = await getDatabase();
  const records = await database.getAll("lists");
  const sortedRecords = records.reduce<LocalListRecord[]>((sorted, record) => {
    const insertionIndex = sorted.findIndex(
      (candidate) => record.updatedAt.localeCompare(candidate.updatedAt) > 0,
    );
    sorted.splice(insertionIndex === -1 ? sorted.length : insertionIndex, 0, record);
    return sorted;
  }, []);

  return sortedRecords
    .map(normalizeLocalListRecord)
    .map((record) => summarizeList(record.snapshot, record.backend));
}

function normalizeLocalListRecord(record: LocalListRecord): LocalListRecord {
  return { ...record, snapshot: parseListSnapshot(record.snapshot) };
}

export async function saveLocalList(
  snapshot: ListSnapshot,
  backend: ListBackend = "local",
): Promise<void> {
  await putRecord({
    id: snapshot.id,
    backend,
    snapshot,
    updatedAt: snapshot.updatedAt,
  });
}

export async function createLocalList(): Promise<ListSnapshot> {
  const snapshot = createListSnapshot(uuidv7());
  await saveLocalList(snapshot);
  return snapshot;
}

export async function ensureLocalListAlias(listId: string): Promise<ListSnapshot | null> {
  const record = await getLocalListRecord(listId.toLowerCase());
  if (!record || record.backend !== "local") {
    return null;
  }
  if (record.snapshot.alias !== null) {
    return record.snapshot;
  }

  const database = await getDatabase();
  const records = await database.getAll("lists");
  let alias: string | undefined;
  for (let attempt = 0; attempt < 32 && alias === undefined; attempt += 1) {
    const candidate = createListAlias(record.snapshot.title);
    if (!records.some((candidateRecord) => candidateRecord.snapshot.alias === candidate)) {
      alias = candidate;
    }
  }
  if (alias === undefined) {
    throw new Error("Could not create a unique list alias");
  }

  const nextSnapshot = { ...record.snapshot, alias };
  await saveLocalList(nextSnapshot);
  return nextSnapshot;
}

export async function applyLocalMutation(
  listId: string,
  mutation: ListMutation,
): Promise<ApplyMutationResult> {
  const normalizedListId = listId.toLowerCase();
  const previousMutation = mutationQueues.get(normalizedListId);
  const runMutation = async (): Promise<ApplyMutationResult> => {
    const record = await getLocalListRecord(normalizedListId);
    if (!record) {
      return { status: "missing" };
    }

    if (record.backend !== "local") {
      throw new Error("Remote lists must be changed through the remote repository");
    }

    const nextSnapshot = applyListMutation(record.snapshot, parseListMutation(mutation));
    if (!nextSnapshot) {
      return { status: "conflict", snapshot: record.snapshot };
    }

    await saveLocalList(nextSnapshot);
    return { status: "ok", snapshot: nextSnapshot };
  };
  const currentMutation = (previousMutation ?? Promise.resolve()).then(runMutation, runMutation);
  mutationQueues.set(normalizedListId, currentMutation);

  try {
    return await currentMutation;
  } finally {
    if (mutationQueues.get(normalizedListId) === currentMutation) {
      mutationQueues.delete(normalizedListId);
    }
  }
}

export async function markListRemote(snapshot: ListSnapshot): Promise<void> {
  await saveLocalList(snapshot, "remote");
}

export async function deleteLocalList(listId: string): Promise<void> {
  const database = await getDatabase();
  await database.delete("lists", listId.toLowerCase());
  emitChange();
}

export async function clearLocalListDatabase(): Promise<void> {
  if (databasePromise) {
    const database = await databasePromise;
    database.close();
    databasePromise = undefined;
  }
  await deleteDB(DATABASE_NAME);
  emitChange();
}
