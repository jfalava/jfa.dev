import type { ListBackend } from "@jfa.dev/common/lists";
import { Button, SiteHeader, buttonVariants } from "@jfa.dev/common/ui";
import { webPackages } from "@jfa.dev/common/web-packages";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, CloudUpload, Copy, Plus, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DocsLink } from "@/app/components/docs-link";
import { HotkeyKbd } from "@/app/components/hotkey-kbd";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { kewekeDocs } from "@/app/lib/docs-paths";
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
  showPublishNudge?: boolean;
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
  showPublishNudge = false,
  onMigrate,
  isUserDialogOpen,
  userDialogMessage,
  onUserDialogOpenChange,
  onUserDialogSaved,
}: KewekeHeaderProps) {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPublishNudgeDismissed, setIsPublishNudgeDismissed] = useState(false);

  useEffect(() => {
    if (!showPublishNudge) {
      // reset dismissed state when nudge hides so next show is visible (external prop sync)
      // oxlint-disable-next-line react/set-state-in-effect
      setIsPublishNudgeDismissed(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsPublishNudgeDismissed(true);
    }, 10_000);

    return () => window.clearTimeout(timeoutId);
  }, [showPublishNudge]);

  const isPublishNudgeVisible = showPublishNudge && !isPublishNudgeDismissed;

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
    <SiteHeader
      title="KEWEKE"
      subtitle="Yet another collaborative shopping list"
      titleHref={appPath("/")}
      packages={webPackages}
      activePackagePath="/keweke"
      navLabel="General navigation"
      githubHref="https://github.com/jfalava/jfa.dev/tree/main/web/keweke"
    >
      <OpenListCommand />

      {isUserDialogOpen !== undefined ? (
        <UserDialog
          key={userDialogMessage ?? "default"}
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
          variant: "ghost",
          size: "lg",
          className:
            "w-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground sm:w-auto sm:gap-1.5",
        })}
      >
        <UserRound aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">User</span>
      </Link>
      {backend === "local" && onMigrate ? (
        <div className="relative">
          <Button
            aria-describedby={showPublishNudge ? "publish-list-nudge" : undefined}
            aria-label="Publish list to a remote list"
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            isDisabled={isMigrating}
            onPress={onMigrate}
            size="lg"
            variant="ghost"
          >
            <CloudUpload className="size-4" />
            <span className="hidden sm:inline">{isMigrating ? "Publishing" : "Publish"}</span>
            {!isMigrating ? (
              <HotkeyKbd className="hidden sm:inline-flex" hotkey={PUBLISH_HOTKEY} />
            ) : null}
          </Button>
          {isPublishNudgeVisible ? (
            <div
              className="absolute top-full right-0 z-40 mt-2 w-64 rounded-md border border-border bg-popover px-3 py-2 text-left text-xs leading-relaxed text-popover-foreground shadow-lg before:absolute before:-top-1 before:right-3 before:size-2 before:rotate-45 before:border-t before:border-l before:border-border before:bg-popover before:content-[''] sm:before:right-10"
              id="publish-list-nudge"
              role="tooltip"
            >
              <button
                aria-label="Dismiss publish tip"
                className="block w-full cursor-pointer text-left"
                onClick={() => setIsPublishNudgeDismissed(true)}
                type="button"
              >
                You can now publish this list to access it from anywhere.
              </button>
              <div className="mt-2 border-t border-border pt-2">
                <DocsLink href={kewekeDocs.publishListDialog} variant="info">
                  Learn more
                </DocsLink>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {listId && backend === "remote" ? (
        <Button
          aria-label="Copy share link"
          className="hidden h-8 min-w-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground sm:inline-flex"
          onPress={() => void copyShareLink()}
          size="lg"
          variant="ghost"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
        </Button>
      ) : null}
      {!hideNewListButton ? (
        <Button
          aria-label="Create new list"
          className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          isDisabled={isCreating}
          onPress={() => void createList()}
          size="lg"
          variant="ghost"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New list</span>
          {!isCreating ? (
            <HotkeyKbd className="hidden sm:inline-flex" hotkey={NEW_LIST_HOTKEY} />
          ) : null}
        </Button>
      ) : null}
    </SiteHeader>
  );
}
