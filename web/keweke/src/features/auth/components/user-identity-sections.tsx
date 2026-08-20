import { Button, Input } from "@jfa.dev/common/ui";
import { Check, Shield, Smartphone } from "lucide-react";

import type { UserManager } from "@/features/auth/hooks/use-user-manager";
import { LOCAL_IDENTITY_PLACEHOLDER } from "@/features/auth/lib/local-identity";

import type { SettingsSectionRow } from "./settings-table";
import { FeedbackMessage } from "./user-feedback";

export function createUsernameSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "username",
    eyebrow: "username",
    subheading: "Your display name across lists",
    description:
      "Set the name attached to your list edits and items. Changes sync to all shared lists.",
    content: (
      <div>
        <form id="username-form" onSubmit={(event) => void manager.save(event)}>
          <Input
            autoComplete="nickname"
            className="mt-1.5 h-10 font-serif text-base sm:text-sm"
            disabled={!manager.identity || manager.isSaving || manager.isCreatingRemoteUser}
            id="user-username"
            maxLength={48}
            onChange={(event) => {
              manager.setValue(event.target.value);
              manager.resetFeedback();
            }}
            placeholder={LOCAL_IDENTITY_PLACEHOLDER}
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
        {manager.isSaving ? "Saving…" : "Save"}
      </Button>
    ),
  };
}

export function createRemoteAccountSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "account-create",
    eyebrow: "remote account",
    subheading: "Use this user across browsers",
    description:
      "Create a remote user with this username so you can pair other browsers and publish lists without creating a list first.",
    content: <FeedbackMessage feedback={manager.feedback} section="account" />,
    action: (
      <Button
        className="h-10 min-w-24 px-5 text-sm"
        isDisabled={manager.isCreatingRemoteUser || manager.isSaving}
        onPress={() => void manager.createRemoteAccount()}
      >
        {manager.isCreatingRemoteUser ? "Creating…" : "Create remote user"}
      </Button>
    ),
  };
}

export function createPasskeyAdoptionSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "passkey-adoption",
    eyebrow: "pair with a passkey",
    subheading: "Connect this browser without a code",
    description: "Use a saved passkey to connect this browser to your existing remote user.",
    content: <FeedbackMessage feedback={manager.feedback} section="passkey-adoption" />,
    action: (
      <Button
        className="h-10 gap-1.5 px-5 text-sm"
        isDisabled={manager.isAdoptingPasskey}
        onPress={() => void manager.adoptWithPasskey()}
      >
        {manager.isAdoptingPasskey ? "Waiting…" : "Pair with passkey"}
      </Button>
    ),
  };
}

export function createPairingSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "pairing",
    eyebrow: "pair a browser",
    subheading: "Use on another device",
    description:
      "Generate a pairing code in this browser and approve it from an existing accepted device.",
    content: (
      <div>
        <FeedbackMessage feedback={manager.feedback} section="pairing" />

        {manager.pairingCode ? (
          <div className="mt-4 border border-border bg-muted/40 p-4">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              pairing code
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em] break-all text-primary sm:text-3xl">
              {manager.pairingCode}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {manager.pairingStatus?.status === "pending"
                ? "Waiting for approval on your other device…"
                : manager.pairingStatus?.status === "approved"
                  ? "Device approved! Ready to connect."
                  : manager.pairingStatus?.status === "expired"
                    ? "Pairing code has expired. Please create a new one."
                    : manager.pairingStatus?.status === "missing"
                      ? "Pairing code is unavailable or expired."
                      : "Checking pairing status…"}
            </p>
            {manager.pairingStatus?.status === "approved" ? (
              <Button
                className="mt-3"
                isDisabled={manager.isAdopting}
                onPress={() => void manager.adopt()}
              >
                <Check className="size-3.5" />
                {manager.isAdopting ? "Saving…" : "Use this username"}
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
        {manager.isStartingPairing ? "Creating…" : "Show pairing code"}
      </Button>
    ),
  };
}

export function createApprovalSection(manager: UserManager): SettingsSectionRow {
  return {
    id: "approval",
    eyebrow: "approve a browser",
    subheading: "Add another device",
    description: "Enter the ten-character pairing code shown on another device to authorize it.",
    content: (
      <div>
        <form id="approval-form" onSubmit={(event) => void manager.findDevice(event)}>
          <Input
            aria-label="Pairing code"
            className="h-10 max-w-48 font-mono tracking-widest uppercase"
            maxLength={10}
            onChange={(event) => manager.setApprovalCode(event.target.value)}
            placeholder="CODE"
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
              <p className="text-sm font-medium">A new device is waiting for approval.</p>
            </div>
            <Button
              className="mt-3"
              isDisabled={manager.isApproving}
              onPress={() => void manager.approve()}
            >
              <Shield className="size-3.5" />
              {manager.isApproving ? "Approving…" : "Approve device"}
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
        {manager.isFindingDevice ? "Finding…" : "Find"}
      </Button>
    ),
  };
}
