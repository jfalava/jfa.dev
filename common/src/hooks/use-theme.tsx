import { preferenceCookies, readPreference, writePreference } from "../preferences";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface BrowserEnvironment {
  window: Window;
  document: Document;
}

function getBrowserEnvironment(): BrowserEnvironment | null {
  const browserWindow = globalThis.window;
  const browserDocument = globalThis.document;

  if (browserWindow === undefined || browserDocument === undefined) {
    return null;
  }

  try {
    return {
      window: browserWindow,
      document: browserDocument,
    };
  } catch {
    return null;
  }
}

function parseThemeMode(value: string | null): ThemeMode | null {
  return value === "light" || value === "dark" || value === "system" ? value : null;
}

function applyTheme(theme: ThemeMode): void {
  const browser = getBrowserEnvironment();
  if (browser === null) {
    return;
  }

  const isDark =
    theme === "dark" ||
    (theme === "system" && browser.window.matchMedia("(prefers-color-scheme: dark)").matches);

  browser.document.documentElement.classList.toggle("dark", isDark);
  browser.document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const browser = getBrowserEnvironment();
    return browser === null
      ? "system"
      : (parseThemeMode(readPreference(preferenceCookies.theme) ?? null) ?? "system");
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const browser = getBrowserEnvironment();
    if (browser === null) {
      return undefined;
    }

    const mediaQuery = browser.window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (nextTheme: ThemeMode): void => {
    setThemeState(nextTheme);
    writePreference(preferenceCookies.theme, nextTheme);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
