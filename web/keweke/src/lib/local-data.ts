import { clearLocalIdentityDatabase } from "./local-identity";
import { clearLocalListDatabase } from "./local-list-store";

export async function clearLocalData(): Promise<void> {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }

  await Promise.all([clearLocalIdentityDatabase(), clearLocalListDatabase()]);
}
