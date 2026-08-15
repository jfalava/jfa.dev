import { Button } from "@jfa.dev/common/ui";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";

import { useTheme, type ThemeMode } from "@/hooks/use-theme";

const themeLabels: Record<ThemeMode, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
};

const themeByKey: Record<string, ThemeMode> = {
  dark: "dark",
  light: "light",
  system: "system",
};

function ThemeIcon({ theme }: { theme: ThemeMode }) {
  if (theme === "dark") {
    return <Moon className="h-5 w-5" />;
  }
  if (theme === "light") {
    return <Sun className="h-5 w-5" />;
  }
  return <Monitor className="h-5 w-5" />;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <MenuTrigger>
      <Button
        aria-label={`Theme: ${themeLabels[theme]}`}
        className="gap-1.5 px-2 text-primary hover:bg-primary/10 hover:text-primary sm:w-auto sm:gap-1"
        size="icon"
        variant="outline"
      >
        <ThemeIcon theme={theme} />
        <span className="hidden sm:inline">{themeLabels[theme]}</span>
      </Button>
      <Popover className="min-w-36 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none">
        <Menu
          aria-label="Choose a theme"
          className="outline-none"
          onAction={(key) => {
            const nextTheme = themeByKey[String(key)];
            if (nextTheme !== undefined) {
              setTheme(nextTheme);
            }
          }}
        >
          <ThemeMenuItem
            icon={<Sun className="size-3.5" />}
            id="light"
            label="Light"
            theme={theme}
          />
          <ThemeMenuItem
            icon={<Moon className="size-3.5" />}
            id="dark"
            label="Dark"
            theme={theme}
          />
          <ThemeMenuItem
            icon={<Monitor className="size-3.5" />}
            id="system"
            label="System"
            theme={theme}
          />
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

function ThemeMenuItem({
  icon,
  id,
  label,
  theme,
}: {
  icon: React.ReactNode;
  id: ThemeMode;
  label: string;
  theme: ThemeMode;
}) {
  return (
    <MenuItem
      className="flex min-h-7 cursor-default items-center gap-2 rounded-sm px-2 py-1 text-xs outline-none data-focused:bg-muted data-focused:text-foreground"
      id={id}
    >
      {icon}
      <span>{label}</span>
      {theme === id ? <Check className="ml-auto size-3.5" /> : null}
    </MenuItem>
  );
}
