import { preferenceCookies, readPreference, writePreference } from "@jfa.dev/common/preferences";
import { useCallback, useSyncExternalStore } from "react";

export type MusicProvider = "apple" | "spotify";

const MUSIC_PROVIDER_COOKIE = preferenceCookies.musicProvider;
const DEFAULT_PROVIDER: MusicProvider = "apple";

function isMusicProvider(value: string | undefined): value is MusicProvider {
  return value === "apple" || value === "spotify";
}

function readProvider(): MusicProvider {
  const raw = readPreference(MUSIC_PROVIDER_COOKIE);
  return isMusicProvider(raw) ? raw : DEFAULT_PROVIDER;
}

// Sync hook that listens to cookie changes (poll storage + custom event).
function subscribe(callback: () => void): () => void {
  window.addEventListener("jfa:music-provider", callback);
  window.addEventListener("storage", callback);
  return (): void => {
    window.removeEventListener("jfa:music-provider", callback);
    window.removeEventListener("storage", callback);
  };
}

type MusicProviderValue = {
  provider: MusicProvider;
  setProvider: (next: MusicProvider) => void;
};

export function useMusicProvider(): MusicProviderValue {
  const provider = useSyncExternalStore(subscribe, readProvider, () => DEFAULT_PROVIDER);

  const setProvider = useCallback((next: MusicProvider): void => {
    writePreference(MUSIC_PROVIDER_COOKIE, next);
    window.dispatchEvent(new Event("jfa:music-provider"));
  }, []);

  return { provider, setProvider } satisfies MusicProviderValue;
}
