import {
  exportPublicKey,
  generateEd25519KeyPair,
  publicKeyFingerprint,
  signPayload,
} from "@jfa.dev/common/crypto";
import { usernameSchema, userProfileSchema, type UserProfile } from "@jfa.dev/common/identities";
import * as Schema from "effect/Schema";
import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";

const DATABASE_NAME = "keweke-local-identity-v2";
const DATABASE_VERSION = 1;
const RECORD_KEY = "current";
const IDENTITY_CHANGE_EVENT = "keweke-local-identity-change";
const STORAGE_VERSION = 2 as const;
export const LOCAL_IDENTITY_PLACEHOLDER = "Your username";

interface LocalIdentityRecord {
  id: typeof RECORD_KEY;
  version: typeof STORAGE_VERSION;
  userId: string;
  userPublicKey: string;
  userPrivateKey?: CryptoKey;
  deviceId: string;
  devicePublicKey: string;
  devicePrivateKey: CryptoKey;
  username: string | null;
  remoteUsername: string | null;
  adopted: boolean;
}

interface KewekeIdentityDatabase extends DBSchema {
  identity: {
    key: string;
    value: LocalIdentityRecord;
  };
}

export type LocalIdentity = {
  userId: string;
  userPublicKey: string;
  deviceId: string;
  devicePublicKey: string;
  username: string | null;
  remoteUsername: string | null;
  adopted: boolean;
};

let databasePromise: Promise<IDBPDatabase<KewekeIdentityDatabase>> | undefined;

function canUseIdentityStorage(): boolean {
  return globalThis.window !== undefined && globalThis.indexedDB !== undefined;
}

function getDatabase(): Promise<IDBPDatabase<KewekeIdentityDatabase>> {
  databasePromise ??= openDB<KewekeIdentityDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      database.createObjectStore("identity");
    },
  });
  return databasePromise;
}

function emitChange(): void {
  if (globalThis.window !== undefined) {
    window.dispatchEvent(new Event(IDENTITY_CHANGE_EVENT));
  }
}

function toLocalIdentity(record: LocalIdentityRecord): LocalIdentity {
  return {
    userId: record.userId,
    userPublicKey: record.userPublicKey,
    deviceId: record.deviceId,
    devicePublicKey: record.devicePublicKey,
    username: record.username,
    remoteUsername: record.remoteUsername,
    adopted: record.adopted,
  };
}

async function readRecord(): Promise<LocalIdentityRecord | undefined> {
  if (!canUseIdentityStorage()) {
    return undefined;
  }
  const database = await getDatabase();
  return database.get("identity", RECORD_KEY);
}

async function writeRecord(record: LocalIdentityRecord): Promise<void> {
  if (!canUseIdentityStorage()) {
    throw new Error("Browser identity storage is unavailable");
  }
  const database = await getDatabase();
  await database.put("identity", record, RECORD_KEY);
  emitChange();
}

async function createRecord(): Promise<LocalIdentityRecord> {
  const userKeys = await generateEd25519KeyPair();
  const deviceKeys = await generateEd25519KeyPair();
  const userPublicKey = await exportPublicKey(userKeys.publicKey);
  const devicePublicKey = await exportPublicKey(deviceKeys.publicKey);

  return {
    id: RECORD_KEY,
    version: STORAGE_VERSION,
    userId: await publicKeyFingerprint(userPublicKey),
    userPublicKey,
    userPrivateKey: userKeys.privateKey,
    deviceId: await publicKeyFingerprint(devicePublicKey),
    devicePublicKey,
    devicePrivateKey: deviceKeys.privateKey,
    username: null,
    remoteUsername: null,
    adopted: false,
  };
}

export async function readLocalIdentity(): Promise<LocalIdentity | undefined> {
  try {
    const record = await readRecord();
    return record ? toLocalIdentity(record) : undefined;
  } catch {
    return undefined;
  }
}

export async function ensureLocalIdentity(): Promise<LocalIdentity | undefined> {
  const existing = await readRecord();
  if (existing) {
    return toLocalIdentity(existing);
  }
  if (!canUseIdentityStorage()) {
    return undefined;
  }

  const created = await createRecord();
  await writeRecord(created);
  return toLocalIdentity(created);
}

export async function saveLocalIdentity(username: string): Promise<LocalIdentity> {
  const normalizedUsername = Schema.decodeUnknownSync(usernameSchema)(username);
  const existing = await readRecord();
  const record = existing ?? (await createRecord());
  const next = { ...record, username: normalizedUsername };
  await writeRecord(next);
  return toLocalIdentity(next);
}

export async function confirmRemoteUsername(username: string): Promise<LocalIdentity> {
  const normalizedUsername = Schema.decodeUnknownSync(usernameSchema)(username);
  const record = await readRecord();
  if (!record) {
    throw new Error("Local identity is unavailable");
  }

  const localUsername =
    record.username === null || record.username === record.remoteUsername
      ? normalizedUsername
      : record.username;
  const next = {
    ...record,
    username: localUsername,
    remoteUsername: normalizedUsername,
  };
  await writeRecord(next);
  return toLocalIdentity(next);
}

export async function adoptLocalIdentity(profileValue: UserProfile): Promise<LocalIdentity> {
  const profile = Schema.decodeUnknownSync(userProfileSchema)(profileValue);
  const record = await readRecord();
  if (!record) {
    throw new Error("Local identity is unavailable");
  }

  const device = profile.devices.find(
    (candidate) =>
      candidate.deviceId === record.deviceId && candidate.publicKey === record.devicePublicKey,
  );
  if (!device || device.revokedAt !== null) {
    throw new Error("This browser is not an approved device");
  }

  const next: LocalIdentityRecord = {
    ...record,
    userId: profile.userId,
    userPublicKey: profile.userPublicKey,
    userPrivateKey: undefined,
    username: profile.username,
    remoteUsername: profile.username,
    adopted: true,
  };
  await writeRecord(next);
  return toLocalIdentity(next);
}

export async function signLocalPayload(payload: string): Promise<string> {
  const record = await readRecord();
  if (!record) {
    throw new Error("Local identity is unavailable");
  }
  return signPayload(record.devicePrivateKey, payload);
}

export async function clearLocalIdentityDatabase(emitIdentityChange = true): Promise<void> {
  if (globalThis.indexedDB === undefined) {
    return;
  }
  if (databasePromise) {
    const database = await databasePromise;
    database.close();
    databasePromise = undefined;
  }
  await deleteDB(DATABASE_NAME);
  if (emitIdentityChange) {
    emitChange();
  }
}

export function subscribeToLocalIdentity(listener: () => void): () => void {
  if (globalThis.window === undefined) {
    return () => undefined;
  }

  const handleChange = (): void => listener();
  window.addEventListener(IDENTITY_CHANGE_EVENT, handleChange);
  return () => window.removeEventListener(IDENTITY_CHANGE_EVENT, handleChange);
}
