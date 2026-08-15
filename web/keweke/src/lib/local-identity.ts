import { listIdentityIdSchema, listIdentitySchema } from "@jfa.dev/common/identities";
import { z } from "zod";

const STORAGE_KEY = "keweke-local-identity";
const IDENTITY_CHANGE_EVENT = "keweke-local-identity-change";
const IDENTITY_ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const STORAGE_VERSION = 1 as const;
export const LOCAL_IDENTITY_PLACEHOLDER = "Anonymous";

const localIdentityRecordSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  id: listIdentityIdSchema,
  username: z.string().trim().min(1).max(48).nullable(),
});

export type LocalIdentity = {
  id: string;
  username: string | null;
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createIdentityId(): string {
  const values = new Uint8Array(5);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(values, (value) => IDENTITY_ALPHABET[value % IDENTITY_ALPHABET.length]).join(
    "",
  );
}

function saveIdentity(identity: LocalIdentity): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, ...identity }),
    );
    window.dispatchEvent(new Event(IDENTITY_CHANGE_EVENT));
  } catch {
    // Private browsing modes can reject localStorage writes. The in-memory identity still works.
  }
}

export function readLocalIdentity(): LocalIdentity | undefined {
  if (!canUseLocalStorage()) {
    return undefined;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return undefined;
    }

    const parsed = JSON.parse(stored) as unknown;
    const current = localIdentityRecordSchema.safeParse(parsed);
    if (current.success) {
      return {
        id: current.data.id,
        username: current.data.username,
      };
    }

    const legacy = listIdentitySchema.safeParse(parsed);
    if (!legacy.success) {
      return undefined;
    }

    return {
      id: legacy.data.id,
      username:
        legacy.data.username.toLowerCase() === LOCAL_IDENTITY_PLACEHOLDER.toLowerCase()
          ? null
          : legacy.data.username,
    };
  } catch {
    return undefined;
  }
}

export function ensureLocalIdentity(): LocalIdentity {
  const existing = readLocalIdentity();
  if (existing) {
    return existing;
  }

  const identity = { id: createIdentityId(), username: null } satisfies LocalIdentity;
  saveIdentity(identity);
  return identity;
}

export function saveLocalIdentity(username: string): LocalIdentity {
  const existing = readLocalIdentity();
  const identity: LocalIdentity = listIdentitySchema.parse({
    id: existing?.id ?? createIdentityId(),
    username,
  });
  saveIdentity(identity);
  return identity;
}

export function subscribeToLocalIdentity(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = (): void => listener();
  window.addEventListener(IDENTITY_CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleChange);
  return () => {
    window.removeEventListener(IDENTITY_CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}
