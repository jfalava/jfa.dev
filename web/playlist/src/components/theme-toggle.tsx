import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@jfa.dev/common/ui";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type ThemeMode } from "@/hooks/use-theme";

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
        className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
        size="lg"
        variant="ghost"
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
