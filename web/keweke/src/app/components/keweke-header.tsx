import type { ListBackend } from "@jfa.dev/common/lists";
import { Button, buttonVariants } from "@jfa.dev/common/ui";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, CloudUpload, Copy, Plus, UserRound } from "lucide-react";
import { useCallback, useState } from "react";

import { HotkeyKbd } from "@/app/components/hotkey-kbd";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { appPath } from "@/app/lib/site-paths";
import { UserDialog } from "@/features/auth/components/user-dialog";
import { OpenListCommand } from "@/features/lists/components/open-list-command";
import { createLocalList } from "@/features/lists/lib/local-list-store";

export const NEW_LIST_HOTKEY = "Mod+E";
const PUBLISH_HOTKEY = "Mod+U";
const ADMIN_HOTKEY_MAC = "Control+Meta+A";
const ADMIN_HOTKEY_WINDOWS = "Control+Alt+A";

interface KewekeHeaderProps {
  listId?: string;
  backend?: ListBackend;
  isMigrating?: boolean;
  onMigrate?: () => void;
  isUserDialogOpen?: boolean;
  userDialogMessage?: string;
  onUserDialogOpenChange?: (isOpen: boolean) => void;
  onUserDialogSaved?: () => void;
  hideNewListButton?: boolean;
}

export function KewekeHeader({
  backend,
  hideNewListButton = false,
  isMigrating,
  listId,
  onMigrate,
  isUserDialogOpen,
  userDialogMessage,
  onUserDialogOpenChange,
  onUserDialogSaved,
}: KewekeHeaderProps) {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const openAdmin = useCallback((): void => {
    window.location.assign(appPath("/admin"));
  }, []);

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

  useHotkeys([
    {
      hotkey: NEW_LIST_HOTKEY,
      callback: () => void createList(),
      options: { enabled: !isCreating },
    },
    {
      hotkey: PUBLISH_HOTKEY,
      callback: () => onMigrate?.(),
      options: {
        enabled: backend === "local" && Boolean(onMigrate) && !isMigrating,
      },
    },
    { hotkey: ADMIN_HOTKEY_MAC, callback: openAdmin },
    { hotkey: ADMIN_HOTKEY_WINDOWS, callback: openAdmin },
  ]);

  return (
    <header className="catalog-header sticky top-0 z-30 shrink-0 border-b border-border bg-background">
      <div className="flex min-h-11 items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:gap-8 lg:px-8">
        <Link to="/" className="min-w-0 cursor-pointer text-sm text-foreground">
          <div aria-label="keweke" className="flex min-w-0 items-baseline gap-3 truncate lg:pr-4">
            <span className="shrink-0 text-sm font-bold text-primary">
              <span className="inline tracking-wide">/KEWEKE</span>
              <span className="hidden pl-0.5 text-xs tracking-tight sm:inline">by JFA</span>
            </span>
            <span className="hidden text-[11px] text-muted-foreground/75 sm:inline">/</span>
            <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
              Yet another collaborative shopping list
            </span>
          </div>
        </Link>

        <nav className="flex shrink-0 items-center gap-1" aria-label="General navigation">
          <OpenListCommand />

          {isUserDialogOpen !== undefined ? (
            <UserDialog
              isOpen={isUserDialogOpen}
              message={userDialogMessage}
              onOpenChange={onUserDialogOpenChange}
              onSaved={onUserDialogSaved}
              showTrigger={false}
            />
          ) : null}
          <ThemeToggle />
          <Link
            to="/user"
            aria-label="User"
            className={buttonVariants({
              variant: "default",
              size: "icon",
              className: "w-7 sm:w-auto sm:gap-1 sm:px-2",
            })}
          >
            <UserRound aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">User</span>
          </Link>
          {backend === "local" && onMigrate ? (
            <Button
              aria-label="Publish list to a remote list"
              className="inline-flex w-7 sm:w-auto sm:gap-1 sm:px-2"
              isDisabled={isMigrating}
              onPress={onMigrate}
              size="icon"
              variant="outline"
            >
              <CloudUpload className="size-3.5" />
              <span className="hidden sm:inline">{isMigrating ? "Publishing" : "Publish"}</span>
              {!isMigrating ? (
                <HotkeyKbd className="hidden sm:inline-flex" hotkey={PUBLISH_HOTKEY} />
              ) : null}
            </Button>
          ) : null}
          {listId && backend === "remote" ? (
            <Button
              aria-label="Copy share link"
              className="hidden h-7 min-w-0 sm:inline-flex"
              onPress={() => void copyShareLink()}
              variant="outline"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
            </Button>
          ) : null}
          {!hideNewListButton ? (
            <Button
              aria-label="Create new list"
              className="inline-flex w-7 sm:w-auto sm:gap-1 sm:px-2"
              isDisabled={isCreating}
              onPress={() => void createList()}
              size="icon"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New list</span>
              {!isCreating ? (
                <HotkeyKbd className="hidden sm:inline-flex" hotkey={NEW_LIST_HOTKEY} />
              ) : null}
            </Button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
