import { useTheme, type ThemeMode } from "../../hooks/use-theme";

import { Button } from "./button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";

import { Check, Monitor, Moon, Sun } from "lucide-react";

const themeLabels = {
  light: "Light",
  dark: "Dark",
  system: "System",
} as const satisfies Record<ThemeMode, string>;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-5 w-5" />;
      case "dark":
        return <Moon className="h-5 w-5" />;
      case "system":
        return <Monitor className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  return (
    <DropdownMenuTrigger>
      <Button
        aria-label={`Theme: ${themeLabels[theme]}`}
        className="gap-1.5 px-2.5 text-primary hover:bg-primary/10 hover:text-primary sm:w-auto sm:gap-1.5 sm:px-2.5"
        size="icon-lg"
        variant="outline"
      >
        <span className="flex items-center justify-center">{getThemeIcon()}</span>
        <span className="hidden sm:inline">{themeLabels[theme]}</span>
      </Button>
      <DropdownMenu placement="bottom end">
        <DropdownMenuItem onAction={() => setTheme("light")}>
          <Sun className="mr-2 size-3.5" />
          <span>Light</span>
          {theme === "light" ? <Check className="ml-auto size-3.5" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onAction={() => setTheme("dark")}>
          <Moon className="mr-2 size-3.5" />
          <span>Dark</span>
          {theme === "dark" ? <Check className="ml-auto size-3.5" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onAction={() => setTheme("system")}>
          <Monitor className="mr-2 size-3.5" />
          <span>System</span>
          {theme === "system" ? <Check className="ml-auto size-3.5" /> : null}
        </DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
