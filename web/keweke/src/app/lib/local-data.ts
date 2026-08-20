import { clearLocalIdentityDatabase } from "@/features/auth/lib/local-identity";
import {
  clearLocalListDatabase,
  clearRemoteListDatabase,
} from "@/features/lists/lib/local-list-store";

export async function clearLocalData(): Promise<void> {
  if (globalThis.window !== undefined) {
    window.localStorage.clear();
  }

  await Promise.all([clearLocalIdentityDatabase(), clearLocalListDatabase()]);
}

export async function clearRemoteUserData(): Promise<void> {
  await Promise.all([clearLocalIdentityDatabase(false), clearRemoteListDatabase()]);
}

export async function clearLocalIdentityData(): Promise<void> {
  await clearLocalIdentityDatabase();
}
