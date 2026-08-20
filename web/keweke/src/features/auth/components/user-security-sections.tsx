import { Button } from "@jfa.dev/common/ui";
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
    eyebrow: "accepted devices",
    subheading: "Manage devices",
    description:
      "Every active device that can sign mutations and approve other devices for this user.",
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
    eyebrow: "passkeys",
    subheading: "Sign in without pairing codes",
    description:
      "Add passkeys to this user. Each passkey can instantly adopt a new browser without generating pairing codes.",
    content: (
      <div>
        {!manager.passkeyAvailable ? (
          <p className="text-sm text-muted-foreground">
            Passkeys are not available in this browser.
          </p>
        ) : null}
        <FeedbackMessage feedback={manager.feedback} section="passkeys" />

        {manager.isLoadingPasskeys ? (
          <p className="mt-4 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            Loading passkeys…
          </p>
        ) : manager.passkeys.length > 0 ? (
          <div className="mt-4">
            <PasskeysTable passkeys={manager.passkeys} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No passkeys added yet.</p>
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
        {manager.isRegisteringPasskey ? "Waiting…" : "Add passkey"}
      </Button>
    ) : undefined,
  };
}
