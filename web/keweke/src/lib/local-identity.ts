import { listIdentitySchema, type ListIdentity } from "@jfa.dev/common/identities";

const STORAGE_KEY = "keweke-local-identity";
const IDENTITY_CHANGE_EVENT = "keweke-local-identity-change";
const IDENTITY_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

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

function saveIdentity(identity: ListIdentity): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    window.dispatchEvent(new Event(IDENTITY_CHANGE_EVENT));
  } catch {
    // Private browsing modes can reject localStorage writes. The in-memory identity still works.
  }
}

export function readLocalIdentity(): ListIdentity | undefined {
  if (!canUseLocalStorage()) {
    return undefined;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return undefined;
    }

    const result = listIdentitySchema.safeParse(JSON.parse(stored) as unknown);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export function ensureLocalIdentity(): ListIdentity {
  const existing = readLocalIdentity();
  if (existing) {
    return existing;
  }

  const identity = listIdentitySchema.parse({ id: createIdentityId(), username: "Anonymous" });
  saveIdentity(identity);
  return identity;
}

export function saveLocalIdentity(username: string): ListIdentity {
  const existing = readLocalIdentity();
  const identity = listIdentitySchema.parse({
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
