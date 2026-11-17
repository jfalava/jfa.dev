import { Button } from "@jfa.dev/common/ui";
import { fbs } from "fbtee";
import { KeyRound } from "lucide-react";

import type { UserManager } from "@/features/auth/hooks/use-user-manager";

import { DevicesTable } from "./devices-table";
import { PasskeysTable } from "./passkeys-table";
import type { SettingsSectionRow } from "./settings-table";
import { FeedbackMessage } from "./user-feedback";

export function createDevicesSection(manager: UserManager): SettingsSectionRow {
  if (!manager.profile) {
    throw new Error("Cannot render devices without a user profile");
  }

  return {
    id: "devices",
    eyebrow: fbs(
      "Accepted devices",
      "Settings row label for the list of devices allowed to act as this user",
    ),
    subheading: fbs(
      "Manage devices",
      "Settings row subheading for the list of devices allowed to act as this user",
    ),
    description: (
      <fbt desc="Explains the accepted devices list in user settings">
        Every active device that can sign mutations and approve other devices for this user.
      </fbt>
    ),
    content: (
      <div>
        <DevicesTable
          confirmingDeviceId={manager.confirmingDeviceId}
          forgettingDeviceId={manager.forgettingDeviceId}
          identity={manager.identity}
          onCancelForget={() => manager.setForgettingDeviceId(undefined)}
          onCancelRevoke={() => manager.setConfirmingDeviceId(undefined)}
          onConfirmForget={(deviceId) => manager.setForgettingDeviceId(deviceId)}
          onConfirmRevoke={(deviceId) => manager.setConfirmingDeviceId(deviceId)}
          onForget={(deviceId) => void manager.forget(deviceId)}
          onRevoke={(deviceId) => void manager.revoke(deviceId)}
          profile={manager.profile}
        />
        <FeedbackMessage feedback={manager.feedback} section="devices" />
      </div>
    ),
  };
}

export function createPasskeysSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "passkeys",
    eyebrow: fbs("Passkeys", "Settings row label for managing the user's passkeys"),
    subheading: fbs(
      "Sign in without pairing codes",
      "Settings row subheading for managing the user's passkeys",
    ),
    description: (
      <fbt desc="Explains passkeys in user settings">
        Add passkeys to this user. Each passkey can instantly adopt a new browser without generating
        pairing codes.
      </fbt>
    ),
    content: (
      <div>
        {!manager.passkeyAvailable ? (
          <p className="text-sm text-muted-foreground">
            <fbt desc="Notice in the passkeys section when the browser does not support passkeys">
              Passkeys are not available in this browser.
            </fbt>
          </p>
        ) : null}
        <FeedbackMessage feedback={manager.feedback} section="passkeys" />

        {manager.isLoadingPasskeys ? (
          <p className="mt-4 type-label text-muted-foreground">
            <fbt desc="Small uppercase loading label in the passkeys section while the user's passkeys are fetched">
              Loading passkeys…
            </fbt>
          </p>
        ) : manager.passkeys.length > 0 ? (
          <div className="mt-4">
            <PasskeysTable passkeys={manager.passkeys} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            <fbt desc="Empty state in the passkeys section when the user has no passkeys">
              No passkeys added yet.
            </fbt>
          </p>
        )}
      </div>
    ),
    action: manager.passkeyAvailable ? (
      <Button
        className="h-9 shrink-0 gap-1.5 px-3 text-sm"
        isDisabled={manager.isRegisteringPasskey}
        onPress={() => void manager.addPasskey()}
      >
        <KeyRound aria-hidden="true" className="size-3.5" />
        {manager.isRegisteringPasskey ? (
          <fbt desc="Add passkey button label while waiting for the browser passkey prompt">
            Waiting…
          </fbt>
        ) : (
          <fbt desc="Button that registers a new passkey for this user">Add passkey</fbt>
        )}
      </Button>
    ) : undefined,
  };
}
