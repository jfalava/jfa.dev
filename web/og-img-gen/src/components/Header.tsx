import { preferenceCookies, readPreference, writePreference } from "@jfa.dev/common/preferences";
import { Link } from "@tanstack/react-router";
import { FileImage, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark" | "system";

function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = readPreference(preferenceCookies.theme);
  if (isTheme(stored)) {
    return stored;
  }

  return "system";
}

function isDarkTheme(theme: Theme): boolean {
  if (theme === "dark") {
    return true;
  }

  return (
    theme === "system" &&
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const isDark = isDarkTheme(theme);
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

export default function Header() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const nextTheme = getPreferredTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = isDarkTheme(theme) ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    writePreference(preferenceCookies.theme, nextTheme);
  };

  return (
    <header className="border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-[1800px] items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium"
          aria-label="OG Image Generator home"
        >
          <span className="inline-flex size-7 items-center justify-center rounded-md border bg-muted">
            <FileImage className="size-4" />
          </span>
          <span>OpenGraph Image Generator</span>
        </Link>
        <Badge variant="secondary" className="ml-auto hidden sm:inline-flex">
          1200 x 630
        </Badge>
        <Button
          size="icon-sm"
          variant="outline"
          onClick={toggleTheme}
          title={`Switch to ${isDarkTheme(theme) ? "light" : "dark"} mode`}
          aria-label={`Switch to ${isDarkTheme(theme) ? "light" : "dark"} mode`}
        >
          {isDarkTheme(theme) ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>
    </header>
  );
}
