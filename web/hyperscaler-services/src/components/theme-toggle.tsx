import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@jfa.dev/common/ui";
import { Sun, Moon, Monitor, Check } from "lucide-react";

import { useTheme, type ThemeMode } from "@/hooks/use-theme";

/**
 * Theme toggle dropdown component with light, dark, and system options.
 * Displays current theme icon and allows switching between themes.
 *
 * @returns Theme toggle dropdown menu
 */
const themeLabels = {
  light: "Light",
  dark: "Dark",
  system: "System",
} as const satisfies Record<ThemeMode, string>;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  /**
   * Gets the appropriate icon for the current theme.
   *
   * @returns Icon component for current theme
   */
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
        variant="ghost"
        size="lg"
        className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
        aria-label={`Theme: ${themeLabels[theme]}`}
      >
        <span className="flex items-center justify-center">{getThemeIcon()}</span>
        <span className="hidden sm:inline">{themeLabels[theme]}</span>
      </Button>
      <DropdownMenu placement="bottom end">
        <DropdownMenuItem onAction={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          {theme === "light" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onAction={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onAction={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
          {theme === "system" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
