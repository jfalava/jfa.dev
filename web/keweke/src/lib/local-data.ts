import { clearLocalIdentityDatabase } from "./local-identity";
import { clearLocalListDatabase, clearRemoteListDatabase } from "./local-list-store";

export async function clearLocalData(): Promise<void> {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }

  await Promise.all([clearLocalIdentityDatabase(), clearLocalListDatabase()]);
}

export async function clearRemoteUserData(): Promise<void> {
  await Promise.all([clearLocalIdentityDatabase(false), clearRemoteListDatabase()]);
}
