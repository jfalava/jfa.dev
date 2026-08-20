import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@jfa.dev/common/ui";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuTrigger>
      <Button
        aria-label={`Theme: ${theme}`}
        className="text-primary hover:bg-primary/10 hover:text-primary"
        size="icon"
        variant="outline"
      >
        {theme === "light" ? <Sun /> : theme === "dark" ? <Moon /> : <Monitor />}
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
