import { Link } from "@tanstack/react-router";
import { FileImage, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem("og-theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export default function Header() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const nextTheme = getPreferredTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem("og-theme", nextTheme);
  };

  return (
    <header className="app-header">
      <div className="app-header__glow" aria-hidden="true" />
      <Link to="/" className="app-header__brand" aria-label="OG Image Generator home">
        <span className="app-header__badge" aria-hidden="true">
          <FileImage className="size-4" />
        </span>
        <span>
          <span className="app-header__title">OpenGraph Image Generator</span>
        </span>
      </Link>
      <span className="app-header__dimension" aria-label="canvas size">
        1200 x 630
      </span>
      <Button
        size="icon-sm"
        variant="outline"
        className="app-header__theme-toggle"
        onClick={toggleTheme}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </header>
  );
}
