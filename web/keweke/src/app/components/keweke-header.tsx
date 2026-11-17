import type { ListBackend } from "@jfa.dev/common/lists";
import { Button, SiteHeader, buttonVariants } from "@jfa.dev/common/ui";
import { webPackages } from "@jfa.dev/common/web-packages";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Link, useNavigate } from "@tanstack/react-router";
import { fbs } from "fbtee";
import { Check, CloudUpload, Copy, Plus, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DocsLink } from "@/app/components/docs-link";
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
  userDialogMessageTone?: "error" | "message";
  onUserDialogOpenChange?: (isOpen: boolean) => void;
  onUserDialogSaved?: () => void;
  userDialogPurpose?: "identity" | "publish";
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
  userDialogMessageTone = "message",
  onUserDialogOpenChange,
  onUserDialogSaved,
  userDialogPurpose = "identity",
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
      titleHref={appPath("/")}
      packages={webPackages}
      activePackagePath="/keweke"
      navLabel={fbs(
        "General navigation",
        "Accessible label of the site header navigation landmark",
      )}
      githubHref="https://github.com/jfalava/jfa.dev/tree/main/web/keweke"
      className="max-md:[&_nav]:ml-auto max-md:[&>.header-gutters]:flex-wrap max-md:[&>.header-gutters]:gap-y-0"
    >
      <OpenListCommand />

      {isUserDialogOpen !== undefined ? (
        <UserDialog
          key={`${userDialogPurpose}:${userDialogMessage ?? "default"}`}
          isOpen={isUserDialogOpen}
          initialMessageTone={userDialogMessageTone}
          message={userDialogMessage}
          onOpenChange={onUserDialogOpenChange}
          onSaved={onUserDialogSaved}
          purpose={userDialogPurpose}
          showTrigger={false}
        />
      ) : null}
      <Link
        to="/user"
        aria-label={fbs("User", "Accessible label of the header link to the user settings page")}
        className={buttonVariants({
          variant: "ghost",
          size: "lg",
          className:
            "w-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground sm:w-auto sm:gap-1.5",
        })}
      >
        <UserRound aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">
          <fbt desc="Header link label that opens the user settings page">User</fbt>
        </span>
      </Link>
      {backend === "local" && onMigrate ? (
        <div className="relative">
          <Button
            aria-describedby={showPublishNudge ? "publish-list-nudge" : undefined}
            aria-label={fbs(
              "Publish list to a remote list",
              "Accessible label of the header button that publishes a local list to the server",
            )}
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            isDisabled={isMigrating}
            onPress={onMigrate}
            size="lg"
            variant="ghost"
          >
            <CloudUpload className="size-4" />
            <span className="hidden sm:inline">
              {isMigrating ? (
                <fbt desc="Header publish button label while the local list is being published">
                  Publishing
                </fbt>
              ) : (
                <fbt desc="Header button label that publishes the local list to the server">
                  Publish
                </fbt>
              )}
            </span>
          </Button>
          {isPublishNudgeVisible ? (
            <div
              className="absolute top-full right-0 z-40 mt-2 w-64 rounded-md border border-border bg-popover px-3 py-2 text-left text-xs leading-relaxed text-popover-foreground shadow-lg before:absolute before:-top-1 before:right-3 before:size-2 before:rotate-45 before:border-t before:border-l before:border-border before:bg-popover before:content-[''] sm:before:right-10"
              id="publish-list-nudge"
              role="tooltip"
            >
              <button
                aria-label={fbs(
                  "Dismiss publish tip",
                  "Accessible label of the tooltip button that hides the tip suggesting to publish the list",
                )}
                className="block w-full cursor-pointer text-left"
                onClick={() => setIsPublishNudgeDismissed(true)}
                type="button"
              >
                <fbt desc="Tooltip under the header publish button suggesting to publish the local list">
                  Publish to open this list on other devices.
                </fbt>
              </button>
              <div className="mt-2 border-t border-border pt-2">
                <DocsLink href={kewekeDocs.publishListDialog} variant="info">
                  <fbt desc="Link in the publish tip to the docs page about publishing lists">
                    Publishing
                  </fbt>
                </DocsLink>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {listId && backend === "remote" ? (
        <Button
          aria-label={fbs(
            "Copy share link",
            "Accessible label of the header button that copies the shared list's link",
          )}
          className="hidden h-8 min-w-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground sm:inline-flex"
          onPress={() => void copyShareLink()}
          size="lg"
          variant="ghost"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          <span className="hidden sm:inline">
            {copied ? (
              <fbt desc="Header share button label right after the list link was copied">
                Copied
              </fbt>
            ) : (
              <fbt desc="Header button label that copies the shared list's link">Share</fbt>
            )}
          </span>
        </Button>
      ) : null}
      {!hideNewListButton ? (
        <Button
          aria-label={fbs(
            "Create new list",
            "Accessible label of the header button that creates a new list",
          )}
          className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          isDisabled={isCreating}
          onPress={() => void createList()}
          size="lg"
          variant="ghost"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">
            <fbt desc="Header button label that creates a new list">New list</fbt>
          </span>
        </Button>
      ) : null}
    </SiteHeader>
  );
}
