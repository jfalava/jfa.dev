import { Button, Input, Toggle } from "@jfa.dev/common/ui";
import { fbs } from "fbtee";
import { Trash2 } from "lucide-react";

import { LOCALE_NAMES, SUPPORTED_LOCALES } from "@/app/i18n/locales";
import { changeLocale, getLocale } from "@/app/i18n/runtime";
import type { UserManager } from "@/features/auth/hooks/use-user-manager";

import type { SettingsSectionRow } from "./settings-table";
import { FeedbackMessage } from "./user-feedback";

export function createLanguageSection(): SettingsSectionRow {
  const current = getLocale();
  return {
    id: "language",
    eyebrow: fbs("Language", "Settings row label for the app language picker"),
    subheading: fbs("App language", "Settings row subheading for the app language picker"),
    description: (
      <fbt desc="Explains the app language picker in user settings">
        Keweke follows your browser language until you pick one here. The choice is saved in this
        browser.
      </fbt>
    ),
    content: (
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_LOCALES.map((locale) => (
          <Toggle
            isSelected={locale === current}
            key={locale}
            lang={locale}
            onChange={() => {
              if (locale !== current) {
                changeLocale(locale);
              }
            }}
            size="lg"
          >
            {LOCALE_NAMES[locale]}
          </Toggle>
        ))}
      </div>
    ),
  };
}

export function createLogoutSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "logout",
    eyebrow: fbs("Session", "Settings row label for logging out of this browser"),
    subheading: fbs("Log out", "Settings row subheading for logging out of this browser"),
    description: (
      <fbt desc="Explains logging out of this browser in user settings">
        Disconnect this user identity from this browser. Lists and local data are retained.
      </fbt>
    ),
    content: (
      <div>
        {manager.isConfirmingLogOut ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-label text-destructive">
              <fbt desc="Small uppercase confirmation question shown before logging out of this browser">
                log out of this browser?
              </fbt>
            </span>
            <Button
              className="h-8 px-4 text-sm"
              isDisabled={manager.isLoggingOut}
              onPress={() => void manager.logOut()}
              variant="destructive"
            >
              {manager.isLoggingOut ? (
                <fbt desc="Log out confirmation button label while logging out">Logging out…</fbt>
              ) : (
                <fbt desc="Button that confirms logging out of this browser">Yes, log out</fbt>
              )}
            </Button>
            <Button
              className="h-8 px-4 text-sm"
              isDisabled={manager.isLoggingOut}
              onPress={() => manager.setIsConfirmingLogOut(false)}
              variant="ghost"
            >
              <fbt desc="Button that cancels logging out of this browser">Cancel</fbt>
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
        <fbt desc="Button in user settings that asks to log out of this browser">Log out</fbt>
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
    eyebrow: fbs("Remote account", "Settings row label for deleting the remote user"),
    eyebrowTone: "destructive",
    subheading: fbs(
      "Delete user and created lists",
      "Settings row subheading for deleting the remote user and the lists it created",
    ),
    description: (
      <fbt desc="Explains what deleting the remote user removes, naming the username">
        Permanently delete{" "}
        <fbt:param name="username">
          <span className="font-serif font-medium text-foreground">{username}</span>
        </fbt:param>{" "}
        and every remote list created by this user. Lists only shared with this user are kept for
        their owners.
      </fbt>
    ),
    content: (
      <div>
        {manager.isConfirmingDeleteAccount ? (
          <div className="max-w-md space-y-3">
            <label className="text-xs font-medium" htmlFor="delete-remote-user-confirmation">
              <fbt desc="Label above the input where the user types their username to confirm deleting the remote user">
                Type{" "}
                <fbt:param name="username">
                  <span className="font-serif font-bold">{username}</span>
                </fbt:param>{" "}
                to confirm deletion
              </fbt>
            </label>
            <Input
              autoComplete="off"
              className="h-10 font-serif text-base md:text-sm"
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
                {manager.isDeletingAccount ? (
                  <fbt desc="Delete remote user confirmation button label while the deletion runs">
                    Deleting…
                  </fbt>
                ) : (
                  <fbt desc="Button that confirms permanently deleting the remote user">
                    Delete remote user
                  </fbt>
                )}
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
                <fbt desc="Button that cancels deleting the remote user">Cancel</fbt>
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
        <fbt desc="Button in user settings that starts deleting the remote user and asks for confirmation">
          Delete remote user
        </fbt>
      </Button>
    ),
  };
}

export function createLocalDataSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "data",
    eyebrow: fbs("Local data", "Settings row label for clearing Keweke data from this browser"),
    subheading: fbs(
      "Clear this browser",
      "Settings row subheading for clearing Keweke data from this browser",
    ),
    description: (
      <fbt desc="Explains what clearing local data removes in user settings">
        Remove local lists, this browser's identity, and Keweke's stored browser data. Remote lists
        are not deleted.
      </fbt>
    ),
    content: (
      <div>
        {manager.isConfirmingClearData ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-label text-destructive">
              <fbt desc="Small uppercase confirmation question shown before clearing all local Keweke data">
                clear all local data?
              </fbt>
            </span>
            <Button
              className="h-8 px-4 text-sm"
              isDisabled={manager.isClearingData}
              onPress={() => void manager.clearData()}
              variant="destructive"
            >
              <Trash2 className="size-3.5" />
              {manager.isClearingData ? (
                <fbt desc="Clear data confirmation button label while local data is being cleared">
                  Clearing…
                </fbt>
              ) : (
                <fbt desc="Button that confirms clearing all local Keweke data">Yes, clear</fbt>
              )}
            </Button>
            <Button
              className="h-8 px-4 text-sm"
              isDisabled={manager.isClearingData}
              onPress={() => manager.setIsConfirmingClearData(false)}
              variant="ghost"
            >
              <fbt desc="Button that cancels clearing local data">Cancel</fbt>
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
        <fbt desc="Button in user settings that starts clearing local data and asks for confirmation">
          Clear data
        </fbt>
      </Button>
    ),
  };
}
