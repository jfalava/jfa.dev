import type { ListBackend } from "@jfa.dev/common/lists";
import { Button, Input } from "@jfa.dev/common/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  CircleHelp,
  CloudUpload,
  Copy,
  Monitor,
  Moon,
  MoreHorizontal,
  Plus,
  Sun,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Menu as AriaMenu, MenuItem, MenuTrigger, Popover, Separator } from "react-aria-components";

import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme, type ThemeMode } from "@/hooks/use-theme";
import { isListAddress, normalizeListAddress } from "@/lib/list-id";
import { createLocalList } from "@/lib/local-list-store";

const mobileThemeOptions: Array<{ id: ThemeMode; label: string }> = [
  { id: "light", label: "Light" },
  { id: "system", label: "System" },
  { id: "dark", label: "Dark" },
];

interface KewekeHeaderProps {
  listId?: string;
  backend?: ListBackend;
  isMigrating?: boolean;
  onMigrate?: () => void;
}

export function KewekeHeader({ backend, isMigrating, listId, onMigrate }: KewekeHeaderProps) {
  const navigate = useNavigate();
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState<string>();
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const openList = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const normalizedTarget = targetId.trim().toLowerCase();
    if (!isListAddress(normalizedTarget)) {
      setError("Enter a valid list alias or UUID7.");
      return;
    }

    setError(undefined);
    const nextListAddress = normalizeListAddress(normalizedTarget);
    await navigate({ to: "/$listId", params: { listId: nextListAddress } });
  };

  const createList = async (): Promise<void> => {
    setIsCreating(true);
    try {
      const result = await createLocalList();
      await navigate({ to: "/$listId", params: { listId: result.id } });
    } finally {
      setIsCreating(false);
    }
  };

  const copyShareLink = async (): Promise<void> => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <header className="catalog-header sticky top-0 z-30 shrink-0 border-b border-border bg-background">
      <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-4 py-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4 sm:px-6 sm:py-0 lg:gap-8 lg:px-8">
        <Link to="/" className="col-start-1 row-start-1 min-w-0 text-sm text-foreground">
          <div
            aria-label="keweke"
            className="flex min-w-0 cursor-default items-baseline gap-3 truncate lg:pr-4"
          >
            <span className="shrink-0 text-sm font-bold text-primary">
              <span className="inline tracking-wide">KEWEKE</span>
              <span className="hidden pl-0.5 text-xs tracking-tight sm:inline">by JFA</span>
            </span>
            <span className="hidden text-[11px] text-muted-foreground/75 sm:inline">/</span>
            <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
              Yet another shopping list
            </span>
          </div>
        </Link>

        <div className="col-start-2 row-start-1 ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1 sm:col-start-3">
          <Link
            aria-label="Help"
            className="hidden size-11 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground sm:inline-flex sm:size-7"
            title="Help"
            to="/help"
          >
            <CircleHelp className="size-3.5" />
          </Link>
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          {backend === "local" && onMigrate ? (
            <Button
              aria-label="Migrate list to a remote list"
              className="hidden h-11 min-w-11 sm:inline-flex sm:h-7 sm:min-w-0"
              isDisabled={isMigrating}
              onPress={onMigrate}
              variant="outline"
            >
              <CloudUpload className="size-3.5" />
              <span className="hidden sm:inline">{isMigrating ? "migrating" : "migrate"}</span>
            </Button>
          ) : null}
          {listId && backend === "remote" ? (
            <Button
              aria-label="Copy share link"
              className="hidden h-11 min-w-11 sm:inline-flex sm:h-7 sm:min-w-0"
              onPress={() => void copyShareLink()}
              variant="outline"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? "copied" : "share"}</span>
            </Button>
          ) : null}
          <MobileHeaderMenu
            backend={backend}
            isMigrating={isMigrating}
            onCopyShareLink={() => void copyShareLink()}
            onMigrate={onMigrate}
          />
          <Button
            aria-label="Create new list"
            className="h-11 min-w-11 sm:h-7 sm:min-w-0"
            isDisabled={isCreating}
            onPress={() => void createList()}
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">new</span>
          </Button>
        </div>
        <form
          className="col-span-2 row-start-2 flex w-full min-w-0 items-center gap-1.5 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:ml-auto sm:w-auto"
          onSubmit={(event) => void openList(event)}
        >
          <label className="sr-only" htmlFor="list-id-input">
            Open list by alias or UUID7
          </label>
          <Input
            id="list-id-input"
            aria-label="Open list by alias or UUID7"
            className="min-w-0 flex-1 font-mono text-[11px] sm:w-56 sm:flex-none"
            enterKeyHint="go"
            onChange={(event) => setTargetId(event.target.value)}
            placeholder="paste alias or UUID7"
            value={targetId}
          />
          <Button className="h-11 sm:h-7" type="submit" variant="outline">
            open
          </Button>
        </form>
      </div>
      {error ? (
        <div className="border-t border-destructive/40 bg-destructive/10 px-3 py-1.5 text-center font-mono text-[10px] tracking-wide text-destructive uppercase">
          error / {error}
        </div>
      ) : null}
    </header>
  );
}

function MobileHeaderMenu({
  backend,
  isMigrating,
  onCopyShareLink,
  onMigrate,
}: {
  backend?: ListBackend;
  isMigrating?: boolean;
  onCopyShareLink: () => void;
  onMigrate?: () => void;
}) {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();

  return (
    <MenuTrigger>
      <Button aria-label="More options" className="size-11 sm:hidden" size="icon" variant="ghost">
        <MoreHorizontal className="size-4" />
      </Button>
      <Popover className="min-w-52 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md outline-none">
        <AriaMenu
          aria-label="More options"
          className="grid grid-cols-3 outline-none"
          onAction={(key) => {
            const keyString = String(key);
            const nextTheme = mobileThemeOptions.find(
              (option) => `theme-${option.id}` === keyString,
            );
            if (nextTheme) {
              setTheme(nextTheme.id);
              return;
            }

            switch (keyString) {
              case "help":
                void navigate({ to: "/help" });
                break;
              case "migrate":
                onMigrate?.();
                break;
              case "share":
                onCopyShareLink();
                break;
            }
          }}
        >
          <MobileMenuItem id="help">Help</MobileMenuItem>
          <Separator className="col-span-3 my-1 h-px bg-border" />
          {mobileThemeOptions.map((option) => (
            <MenuItem
              aria-label={`${option.label} theme`}
              className={`flex min-h-11 min-w-0 items-center justify-center rounded-sm px-1.5 py-2 outline-none data-[focused]:bg-muted data-[focused]:text-foreground ${theme === option.id ? "bg-primary text-primary-foreground" : ""}`}
              id={`theme-${option.id}`}
              key={option.id}
            >
              <MobileThemeIcon theme={option.id} />
            </MenuItem>
          ))}
          {backend === "local" && onMigrate ? (
            <>
              <Separator className="col-span-3 my-1 h-px bg-border" />
              <MobileMenuItem id="migrate" isDisabled={isMigrating}>
                {isMigrating ? "Migrating" : "Migrate list"}
              </MobileMenuItem>
            </>
          ) : null}
          {backend === "remote" ? (
            <>
              <Separator className="col-span-3 my-1 h-px bg-border" />
              <MobileMenuItem id="share">Copy share link</MobileMenuItem>
            </>
          ) : null}
        </AriaMenu>
      </Popover>
    </MenuTrigger>
  );
}

function MobileMenuItem({
  children,
  id,
  isDisabled,
  isSelected,
}: {
  children: ReactNode;
  id: string;
  isDisabled?: boolean;
  isSelected?: boolean;
}) {
  return (
    <MenuItem
      className="col-span-3 flex min-h-12 cursor-default items-center gap-2 rounded-sm px-3 py-3 text-sm outline-none data-[focused]:bg-muted data-[focused]:text-foreground"
      id={id}
      isDisabled={isDisabled}
    >
      {children}
      {isSelected ? <Check className="ml-auto size-3.5" /> : null}
    </MenuItem>
  );
}

function MobileThemeIcon({ theme }: { theme: ThemeMode }) {
  if (theme === "light") {
    return <Sun className="size-3.5" />;
  }
  if (theme === "dark") {
    return <Moon className="size-3.5" />;
  }
  return <Monitor className="size-3.5" />;
}
