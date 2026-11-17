import { Button, Input } from "@jfa.dev/common/ui";
import { fbs } from "fbtee";
import { Check, Shield, Smartphone } from "lucide-react";

import type { UserManager } from "@/features/auth/hooks/use-user-manager";

import type { SettingsSectionRow } from "./settings-table";
import { FeedbackMessage } from "./user-feedback";

export function createUsernameSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "username",
    eyebrow: fbs("Username", "Settings row label for the username field"),
    subheading: fbs(
      "Your display name across lists",
      "Settings row subheading explaining the username is shown on lists",
    ),
    description: (
      <fbt desc="Explains the username setting in user settings">
        Set the name attached to your list edits and items. Changes sync to all shared lists.
      </fbt>
    ),
    content: (
      <div>
        <form id="username-form" onSubmit={(event) => void manager.save(event)}>
          <Input
            autoComplete="nickname"
            className="mt-1.5 h-10 font-serif text-base md:text-sm"
            disabled={!manager.identity || manager.isSaving || manager.isCreatingRemoteUser}
            id="user-username"
            maxLength={48}
            onChange={(event) => {
              manager.setValue(event.target.value);
              manager.resetFeedback();
            }}
            placeholder={fbs("Your name", "Placeholder in the empty username input")}
            value={manager.value}
          />
        </form>
        <FeedbackMessage feedback={manager.feedback} section="username" />
      </div>
    ),
    action: (
      <Button
        className="h-10 min-w-24 px-5 text-sm"
        form="username-form"
        isDisabled={!manager.identity || manager.isSaving || manager.isCreatingRemoteUser}
        type="submit"
      >
        {manager.isSaving ? (
          <fbt desc="Username save button label while the username is being saved">Saving…</fbt>
        ) : (
          <fbt desc="Button that saves the username in user settings">Save</fbt>
        )}
      </Button>
    ),
  };
}

export function createRemoteAccountSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "account-create",
    eyebrow: fbs("Remote account", "Settings row label for creating a remote user"),
    subheading: fbs(
      "Use this user across browsers",
      "Settings row subheading for creating a remote user",
    ),
    description: (
      <fbt desc="Explains what creating a remote user does in user settings">
        Create a remote user with this username so you can pair other browsers and publish lists
        without creating a list first.
      </fbt>
    ),
    content: <FeedbackMessage feedback={manager.feedback} section="account" />,
    action: (
      <Button
        className="h-10 min-w-24 px-5 text-sm"
        isDisabled={manager.isCreatingRemoteUser || manager.isSaving}
        onPress={() => void manager.createRemoteAccount()}
      >
        {manager.isCreatingRemoteUser ? (
          <fbt desc="Create remote user button label while the remote user is being created">
            Creating…
          </fbt>
        ) : (
          <fbt desc="Button that creates a remote user for this browser's identity">
            Create remote user
          </fbt>
        )}
      </Button>
    ),
  };
}

export function createPasskeyAdoptionSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "passkey-adoption",
    eyebrow: fbs(
      "Pair with a passkey",
      "Settings row label for connecting this browser with a saved passkey",
    ),
    subheading: fbs(
      "Connect this browser without a code",
      "Settings row subheading for connecting this browser with a saved passkey",
    ),
    description: (
      <fbt desc="Explains connecting this browser to an existing remote user with a passkey">
        Use a saved passkey to connect this browser to your existing remote user.
      </fbt>
    ),
    content: <FeedbackMessage feedback={manager.feedback} section="passkey-adoption" />,
    action: (
      <Button
        className="h-10 gap-1.5 px-5 text-sm"
        isDisabled={manager.isAdoptingPasskey}
        onPress={() => void manager.adoptWithPasskey()}
      >
        {manager.isAdoptingPasskey ? (
          <fbt desc="Pair with passkey button label while waiting for the browser passkey prompt">
            Waiting…
          </fbt>
        ) : (
          <fbt desc="Button that connects this browser to a remote user with a saved passkey">
            Pair with passkey
          </fbt>
        )}
      </Button>
    ),
  };
}

export function createPairingSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "pairing",
    eyebrow: fbs(
      "Pair a browser",
      "Settings row label for generating a pairing code to connect this browser",
    ),
    subheading: fbs(
      "Use on another device",
      "Settings row subheading for generating a pairing code to connect this browser",
    ),
    description: (
      <fbt desc="Explains generating a pairing code in this browser">
        Generate a pairing code in this browser and approve it from an existing accepted device.
      </fbt>
    ),
    content: (
      <div>
        <FeedbackMessage feedback={manager.feedback} section="pairing" />

        {manager.pairingCode ? (
          <div className="mt-4 border border-border bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground">
              <fbt desc="Label above the generated pairing code in user settings">Pairing code</fbt>
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em] break-all text-primary sm:text-3xl">
              {manager.pairingCode}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {manager.pairingStatus?.status === "pending" ? (
                <fbt desc="Pairing code status while waiting for another device to approve it">
                  Waiting for approval on your other device…
                </fbt>
              ) : manager.pairingStatus?.status === "approved" ? (
                <fbt desc="Pairing code status after another device approved it">
                  Device approved! Ready to connect.
                </fbt>
              ) : manager.pairingStatus?.status === "expired" ? (
                <fbt desc="Pairing code status after the code expired">
                  Pairing code has expired. Please create a new one.
                </fbt>
              ) : manager.pairingStatus?.status === "missing" ? (
                <fbt desc="Pairing code status when the server no longer knows the code">
                  Pairing code is unavailable or expired.
                </fbt>
              ) : (
                <fbt desc="Pairing code status while the first status check is running">
                  Checking pairing status…
                </fbt>
              )}
            </p>
            {manager.pairingStatus?.status === "approved" ? (
              <Button
                className="mt-3"
                isDisabled={manager.isAdopting}
                onPress={() => void manager.adopt()}
              >
                <Check className="size-3.5" />
                {manager.isAdopting ? (
                  <fbt desc="Use this username button label while this browser connects to the approved user">
                    Saving…
                  </fbt>
                ) : (
                  <fbt desc="Button that connects this browser to the user that approved the pairing code">
                    Use this username
                  </fbt>
                )}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    ),
    action: (
      <Button
        className="h-10 min-w-24 px-5 text-sm"
        isDisabled={!manager.identity || manager.isStartingPairing}
        onPress={() => void manager.startPairing()}
      >
        {manager.isStartingPairing ? (
          <fbt desc="Show pairing code button label while the pairing code is being created">
            Creating…
          </fbt>
        ) : (
          <fbt desc="Button that generates a pairing code for this browser">Show pairing code</fbt>
        )}
      </Button>
    ),
  };
}

export function createApprovalSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "approval",
    eyebrow: fbs(
      "Approve a browser",
      "Settings row label for approving another device with its pairing code",
    ),
    subheading: fbs(
      "Add another device",
      "Settings row subheading for approving another device with its pairing code",
    ),
    description: (
      <fbt desc="Explains approving another device with its pairing code">
        Enter the ten-character pairing code shown on another device to authorize it.
      </fbt>
    ),
    content: (
      <div>
        <form id="approval-form" onSubmit={(event) => void manager.findDevice(event)}>
          <Input
            aria-label={fbs(
              "Pairing code",
              "Accessible label for the input where the user types another device's pairing code",
            )}
            className="h-10 max-w-48 font-mono tracking-widest uppercase"
            maxLength={10}
            onChange={(event) => manager.setApprovalCode(event.target.value)}
            placeholder={fbs(
              "CODE",
              "Uppercase placeholder in the empty pairing code input of the approve-a-browser section",
            )}
            spellCheck={false}
            value={manager.approvalCode}
          />
        </form>
        <FeedbackMessage feedback={manager.feedback} section="approval" />

        {manager.pairingStatus?.status === "pending" &&
        manager.pairingStatus.code === manager.approvalCode ? (
          <div className="mt-4 border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 text-primary" />
              <p className="text-sm font-medium">
                <fbt desc="Notice after a valid pairing code is found and its device awaits approval">
                  A new device is waiting for approval.
                </fbt>
              </p>
            </div>
            <Button
              className="mt-3"
              isDisabled={manager.isApproving}
              onPress={() => void manager.approve()}
            >
              <Shield className="size-3.5" />
              {manager.isApproving ? (
                <fbt desc="Approve device button label while the approval is in progress">
                  Approving…
                </fbt>
              ) : (
                <fbt desc="Button that approves the device waiting with the entered pairing code">
                  Approve device
                </fbt>
              )}
            </Button>
          </div>
        ) : null}
      </div>
    ),
    action: (
      <Button
        className="h-10 min-w-24 px-5 text-sm"
        form="approval-form"
        isDisabled={manager.isFindingDevice || !manager.identity}
        type="submit"
      >
        {manager.isFindingDevice ? (
          <fbt desc="Find button label while looking up the entered pairing code">Finding…</fbt>
        ) : (
          <fbt desc="Button that looks up the device for the entered pairing code">Find</fbt>
        )}
      </Button>
    ),
  };
}
