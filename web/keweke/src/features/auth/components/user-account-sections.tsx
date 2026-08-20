import { Button, Input } from "@jfa.dev/common/ui";
import { Trash2 } from "lucide-react";

import type { UserManager } from "@/features/auth/hooks/use-user-manager";

import type { SettingsSectionRow } from "./settings-table";
import { FeedbackMessage } from "./user-feedback";

export function createLogoutSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "logout",
    eyebrow: "session",
    subheading: "Log out",
    description:
      "Disconnect this user identity from this browser. Lists and local data are retained.",
    content: (
      <div>
        {manager.isConfirmingLogOut ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.08em] text-destructive uppercase">
              log out of this browser?
            </span>
            <Button
              className="h-8 px-4 text-sm"
              isDisabled={manager.isLoggingOut}
              onPress={() => void manager.logOut()}
              variant="destructive"
            >
              {manager.isLoggingOut ? "Logging out…" : "Yes, log out"}
            </Button>
            <Button
              className="h-8 px-4 text-sm"
              isDisabled={manager.isLoggingOut}
              onPress={() => manager.setIsConfirmingLogOut(false)}
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        ) : null}
        <FeedbackMessage feedback={manager.feedback} section="logout" />
      </div>
    ),
    action: manager.isConfirmingLogOut ? undefined : (
      <Button
        className="h-10 min-w-24 px-5 text-sm"
        onPress={() => manager.setIsConfirmingLogOut(true)}
        variant="outline"
      >
        Log out
      </Button>
    ),
  };
}

export function createAccountDeletionSection(manager: UserManager): SettingsSectionRow {
  const username = manager.identity?.remoteUsername;
  if (!username) {
    throw new Error("Cannot render account deletion without a remote username");
  }

  return {
    id: "account-delete",
    eyebrow: "remote account",
    eyebrowTone: "destructive",
    subheading: "Delete user and created lists",
    description: (
      <>
        Permanently delete{" "}
        <span className="font-serif font-medium text-foreground">{username}</span> and every remote
        list created by this user. Lists only shared with this user are kept for their owners.
      </>
    ),
    content: (
      <div>
        {manager.isConfirmingDeleteAccount ? (
          <div className="max-w-md space-y-3">
            <label className="text-xs font-medium" htmlFor="delete-remote-user-confirmation">
              Type <span className="font-serif font-bold">{username}</span> to confirm deletion
            </label>
            <Input
              autoComplete="off"
              className="h-10 font-serif text-base sm:text-sm"
              disabled={manager.isDeletingAccount}
              id="delete-remote-user-confirmation"
              onChange={(event) => {
                manager.setDeleteConfirmation(event.target.value);
                manager.resetFeedback();
              }}
              spellCheck={false}
              value={manager.deleteConfirmation}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-8 px-4 text-sm"
                isDisabled={manager.isDeletingAccount || manager.deleteConfirmation !== username}
                onPress={() => void manager.deleteAccount()}
                variant="destructive"
              >
                <Trash2 className="size-3.5" />
                {manager.isDeletingAccount ? "Deleting…" : "Delete remote user"}
              </Button>
              <Button
                className="h-8 px-4 text-sm"
                isDisabled={manager.isDeletingAccount}
                onPress={() => {
                  manager.setIsConfirmingDeleteAccount(false);
                  manager.setDeleteConfirmation("");
                }}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
        <FeedbackMessage feedback={manager.feedback} section="account" />
      </div>
    ),
    action: manager.isConfirmingDeleteAccount ? undefined : (
      <Button
        className="h-10 min-w-24 px-5 text-sm"
        onPress={() => manager.setIsConfirmingDeleteAccount(true)}
        variant="destructive"
      >
        Delete remote user
      </Button>
    ),
  };
}

export function createLocalDataSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "data",
    eyebrow: "local data",
    subheading: "Clear this browser",
    description:
      "Remove local lists, this browser's identity, and Keweke's stored browser data. Remote lists are not deleted.",
    content: (
      <div>
        {manager.isConfirmingClearData ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.08em] text-destructive uppercase">
              clear all local data?
            </span>
            <Button
              className="h-8 px-4 text-sm"
              isDisabled={manager.isClearingData}
              onPress={() => void manager.clearData()}
              variant="destructive"
            >
              <Trash2 className="size-3.5" />
              {manager.isClearingData ? "Clearing…" : "Yes, clear"}
            </Button>
            <Button
              className="h-8 px-4 text-sm"
              isDisabled={manager.isClearingData}
              onPress={() => manager.setIsConfirmingClearData(false)}
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        ) : null}
        <FeedbackMessage feedback={manager.feedback} section="data" />
      </div>
    ),
    action: manager.isConfirmingClearData ? undefined : (
      <Button
        className="h-10 min-w-24 px-5 text-sm"
        onPress={() => manager.setIsConfirmingClearData(true)}
        variant="destructive"
      >
        Clear data
      </Button>
    ),
  };
}
