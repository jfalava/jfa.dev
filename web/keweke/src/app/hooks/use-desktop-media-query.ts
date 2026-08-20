import { useSyncExternalStore } from "react";

const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

function subscribe(onStoreChange: () => void): () => void {
  const browserWindow = globalThis.window;
  if (browserWindow === undefined) {
    return () => {};
  }

  const mediaQuery = browserWindow.matchMedia(DESKTOP_MEDIA_QUERY);
  const handleChange = (): void => onStoreChange();
  mediaQuery.addEventListener("change", handleChange);

  return () => mediaQuery.removeEventListener("change", handleChange);
}

function getSnapshot(): boolean {
  const browserWindow = globalThis.window;
  return browserWindow === undefined || browserWindow.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
