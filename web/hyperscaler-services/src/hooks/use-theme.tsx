import { useState, useEffect, createContext, useContext, type ReactNode } from "react";

/**
 * Available theme modes for the application.
 */
export type ThemeMode = "light" | "dark" | "system";

interface BrowserEnvironment {
  window: Window;
  document: Document;
  storage: Storage;
}

function getBrowserEnvironment(): BrowserEnvironment | null {
  const browserWindow = globalThis.window;
  const browserDocument = globalThis.document;

  if (browserWindow === undefined || browserDocument === undefined) {
    return null;
  }

  return {
    window: browserWindow,
    document: browserDocument,
    storage: browserWindow.localStorage,
  };
}

function parseThemeMode(value: string | null): ThemeMode | null {
  return value === "light" || value === "dark" || value === "system" ? value : null;
}

/**
 * Applies the specified theme to the document element.
 *
 * @param theme - The theme mode to apply
 */
function applyTheme(theme: ThemeMode): void {
  const browser = getBrowserEnvironment();
  if (browser === null) {
    return;
  }

  const isDark =
    theme === "dark" ||
    (theme === "system" && browser.window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    browser.document.documentElement.classList.add("dark");
    browser.document.documentElement.style.colorScheme = "dark";
  } else {
    browser.document.documentElement.classList.remove("dark");
    browser.document.documentElement.style.colorScheme = "light";
  }
}

/**
 * Interface for the theme context value.
 */
interface ThemeContextType {
  /** Current theme mode */
  theme: ThemeMode;
  /** Function to set the theme mode */
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Provider component that manages theme state for the application.
 *
 * @param children - Child components to wrap with theme context
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const browser = getBrowserEnvironment();
    if (browser !== null) {
      const savedTheme = parseThemeMode(browser.storage.getItem("theme"));
      if (savedTheme !== null) {
        return savedTheme;
      }
    }
    return "system";
  });

  useEffect(() => {
    if (getBrowserEnvironment() !== null) {
      applyTheme(theme);
    }
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

  /**
   * Sets the theme and persists it to localStorage.
   *
   * @param newTheme - The new theme mode to set
   */
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    const browser = getBrowserEnvironment();
    if (browser !== null) {
      browser.storage.setItem("theme", newTheme);
    }
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

/**
 * Hook for accessing theme state and setter function.
 * Must be used within a ThemeProvider component.
 *
 * @returns Theme context value containing current theme and setter
 * @throws Error if used outside of ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
