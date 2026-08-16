import { Button, Input } from "@jfa.dev/common/ui";
import { KeyRound, UserRound } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "react-aria-components";

import {
  useUserManager,
  type DialogFeedback,
  type FeedbackSection,
} from "@/hooks/use-user-manager";
import { LOCAL_IDENTITY_PLACEHOLDER } from "@/lib/local-identity";

function FeedbackMessage({
  feedback,
  section,
}: {
  feedback?: DialogFeedback;
  section: FeedbackSection;
}) {
  if (feedback?.section !== section) {
    return null;
  }

  return (
    <p className={feedback.tone === "error" ? "text-sm text-destructive" : "text-sm text-primary"}>
      {feedback.text}
    </p>
  );
}

function formatPasskeyDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export interface UserDialogProps {
  isOpen?: boolean;
  message?: string;
  onOpenChange?: (isOpen: boolean) => void;
  onSaved?: () => void;
  showTrigger?: boolean;
}

export function UserDialog({
  isOpen: controlledIsOpen,
  message,
  onOpenChange,
  onSaved,
  showTrigger = false,
}: UserDialogProps = {}) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const isDialogOpen = controlledIsOpen ?? uncontrolledIsOpen;

  const setDialogOpen = (isOpen: boolean): void => {
    if (controlledIsOpen === undefined) {
      setUncontrolledIsOpen(isOpen);
    }
    onOpenChange?.(isOpen);
  };

  const {
    identity,
    profile,
    value,
    setValue,
    approvalCode,
    setApprovalCode,
    pairingCode,
    pairingStatus,
    feedback,
    resetFeedback,
    isSaving,
    isCreatingRemoteUser,
    isStartingPairing,
    isFindingDevice,
    isApproving,
    passkeys,
    isLoadingPasskeys,
    isRegisteringPasskey,
    isAdoptingPasskey,
    isAdopting,
    isLoggingOut,
    isConfirmingLogOut,
    setIsConfirmingLogOut,
    isClearingData,
    isConfirmingClearData,
    setIsConfirmingClearData,
    isDeletingAccount,
    isConfirmingDeleteAccount,
    setIsConfirmingDeleteAccount,
    deleteConfirmation,
    setDeleteConfirmation,
    confirmingDeviceId,
    setConfirmingDeviceId,
    canManagePasskeys,
    passkeyAvailable,
    save,
    createRemoteAccount,
    startPairing,
    addPasskey,
    adoptWithPasskey,
    adopt,
    findDevice,
    approve,
    revoke,
    logOut,
    clearData,
    deleteAccount,
  } = useUserManager({
    isActive: isDialogOpen,
    initialMessage: message,
    onSaved,
    onNavigateAfterClear: () => {
      setDialogOpen(false);
    },
  });

  const dialogContent = (
    <Modal className="flex h-[calc(100svh-3rem)] w-full max-w-lg flex-col outline-none sm:h-140 sm:max-h-[calc(100vh-5.5rem)]">
      <Dialog
        aria-label="Set your username"
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
      >
        <div className="shrink-0 border-b border-border px-4 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-mono text-[10px] tracking-[0.12em] text-primary uppercase">
              device identity
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">
          <form className="space-y-3" onSubmit={(event) => void save(event)}>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium" htmlFor="user-username">
                  Username
                </label>
                <Input
                  autoComplete="nickname"
                  className="mt-1.5 h-10 font-serif text-base sm:text-sm"
                  disabled={!identity || isSaving || isCreatingRemoteUser}
                  id="user-username"
                  maxLength={48}
                  onChange={(event) => {
                    setValue(event.target.value);
                    resetFeedback();
                  }}
                  placeholder={LOCAL_IDENTITY_PLACEHOLDER}
                  value={value}
                />
              </div>
              <Button
                className="h-10 min-w-24 px-5 text-sm"
                isDisabled={!identity || isSaving || isCreatingRemoteUser}
                type="submit"
              >
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
            <FeedbackMessage feedback={feedback} section="username" />
          </form>

          {identity && !identity.remoteUsername ? (
            <section
              className="space-y-3 border-t border-border pt-4"
              aria-labelledby="create-account-heading"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                  remote account
                </p>
                <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                  /
                </span>
                <h3
                  className="text-[11px] font-normal text-muted-foreground/75"
                  id="create-account-heading"
                >
                  Use this user across browsers
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Create a remote user with this username so you can pair other browsers and publish
                lists without creating a list first.
              </p>
              <Button
                className="h-10 min-w-24 px-5 text-sm"
                isDisabled={isCreatingRemoteUser || isSaving}
                onPress={() => void createRemoteAccount()}
              >
                {isCreatingRemoteUser ? "Creating…" : "Create remote user"}
              </Button>
              <FeedbackMessage feedback={feedback} section="account" />
            </section>
          ) : null}

          {identity && !identity.remoteUsername && passkeyAvailable ? (
            <section
              className="space-y-3 border-t border-border pt-4"
              aria-labelledby="passkey-adoption-heading"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                  pair with a passkey
                </p>
                <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                  /
                </span>
                <h3
                  className="text-[11px] font-normal text-muted-foreground/75"
                  id="passkey-adoption-heading"
                >
                  Connect this browser without a code
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Use a saved passkey to connect this browser to your remote user.
              </p>
              <Button
                className="h-10 gap-1.5 px-5 text-sm"
                isDisabled={isAdoptingPasskey}
                onPress={() => void adoptWithPasskey()}
              >
                <KeyRound aria-hidden="true" className="size-3.5" />
                {isAdoptingPasskey ? "Waiting…" : "Pair with passkey"}
              </Button>
              <FeedbackMessage feedback={feedback} section="passkey-adoption" />
            </section>
          ) : null}

          {identity && !identity.remoteUsername ? (
            <section
              className="space-y-3 border-t border-border pt-4"
              aria-labelledby="pairing-heading"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                  pair a browser
                </p>
                <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                  /
                </span>
                <h3
                  className="text-[11px] font-normal text-muted-foreground/75"
                  id="pairing-heading"
                >
                  Use on another device
                </h3>
              </div>
              <Button
                className="h-10 min-w-24 px-5 text-sm"
                isDisabled={!identity || isStartingPairing}
                onPress={() => void startPairing()}
              >
                {isStartingPairing ? "Creating…" : "Show code"}
              </Button>
              <FeedbackMessage feedback={feedback} section="pairing" />
              {pairingCode ? (
                <div className="border border-border bg-muted/40 p-3">
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    pairing code
                  </p>
                  <p className="mt-1 font-mono text-xl tracking-[0.18em] break-all text-primary">
                    {pairingCode}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {pairingStatus?.status === "pending"
                      ? "Waiting…"
                      : pairingStatus?.status === "approved"
                        ? "Ready."
                        : pairingStatus?.status === "expired"
                          ? "Expired."
                          : pairingStatus?.status === "missing"
                            ? "Unavailable."
                            : "Checking status…"}
                  </p>
                  {pairingStatus?.status === "approved" ? (
                    <Button className="mt-3" isDisabled={isAdopting} onPress={() => void adopt()}>
                      {isAdopting ? "Saving…" : "Use this username"}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {identity?.remoteUsername ? (
            <section
              className="space-y-3 border-t border-border pt-4"
              aria-labelledby="approve-heading"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                  approve a browser
                </p>
                <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                  /
                </span>
                <h3
                  className="text-[11px] font-normal text-muted-foreground/75"
                  id="approve-heading"
                >
                  Add another device
                </h3>
              </div>
              <form className="flex gap-2" onSubmit={(event) => void findDevice(event)}>
                <Input
                  aria-label="Pairing code"
                  className="h-10 font-mono tracking-widest uppercase"
                  maxLength={10}
                  onChange={(event) => setApprovalCode(event.target.value)}
                  placeholder="CODE"
                  spellCheck={false}
                  value={approvalCode}
                />
                <Button
                  className="h-10 min-w-24 px-5 text-sm"
                  isDisabled={isFindingDevice || !identity}
                  type="submit"
                >
                  {isFindingDevice ? "Finding…" : "Find"}
                </Button>
              </form>
              <FeedbackMessage feedback={feedback} section="approval" />
              {pairingStatus?.status === "pending" && pairingStatus.code === approvalCode ? (
                <div className="border border-border p-3">
                  <p className="text-sm">A new device is waiting.</p>
                  <Button className="mt-3" isDisabled={isApproving} onPress={() => void approve()}>
                    {isApproving ? "Approving…" : "Approve device"}
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}

          {profile ? (
            <section
              className="space-y-3 border-t border-border pt-4"
              aria-labelledby="devices-heading"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                  accepted devices
                </p>
                <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                  /
                </span>
                <h3
                  className="text-[11px] font-normal text-muted-foreground/75"
                  id="devices-heading"
                >
                  Manage devices
                </h3>
              </div>
              <div className="divide-y divide-border border border-border">
                {profile.devices.map((device) => (
                  <div
                    className="flex items-center justify-between gap-3 p-3"
                    key={device.deviceId}
                  >
                    <div className="min-w-0">
                      <p className="text-sm">
                        {device.deviceId === identity?.deviceId ? "This device" : "Other device"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {device.revokedAt ? "Revoked" : "Active"}
                      </p>
                    </div>
                    {device.revokedAt === null ? (
                      confirmingDeviceId === device.deviceId ? (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            onPress={() => void revoke(device.deviceId)}
                            size="sm"
                            variant="destructive"
                          >
                            Confirm
                          </Button>
                          <Button
                            onPress={() => setConfirmingDeviceId(undefined)}
                            size="sm"
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onPress={() => setConfirmingDeviceId(device.deviceId)}
                          size="sm"
                          variant="ghost"
                        >
                          Revoke
                        </Button>
                      )
                    ) : null}
                  </div>
                ))}
              </div>
              <FeedbackMessage feedback={feedback} section="devices" />
            </section>
          ) : null}

          {canManagePasskeys ? (
            <section
              aria-labelledby="passkeys-heading"
              className="space-y-3 border-t border-border pt-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                  passkeys
                </p>
                <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                  /
                </span>
                <h3
                  className="text-[11px] font-normal text-muted-foreground/75"
                  id="passkeys-heading"
                >
                  Sign in without pairing codes
                </h3>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm text-muted-foreground">
                  Add more passkeys. Each one can adopt a new browser without a pairing code.
                </p>
                {passkeyAvailable ? (
                  <Button
                    className="h-9 shrink-0 gap-1.5 px-3 text-sm"
                    isDisabled={isRegisteringPasskey}
                    onPress={() => void addPasskey()}
                  >
                    <KeyRound aria-hidden="true" className="size-3.5" />
                    {isRegisteringPasskey ? "Waiting…" : "Add passkey"}
                  </Button>
                ) : null}
              </div>
              {!passkeyAvailable ? (
                <p className="text-sm text-muted-foreground">
                  Passkeys are not available in this browser.
                </p>
              ) : null}
              <FeedbackMessage feedback={feedback} section="passkeys" />
              {isLoadingPasskeys ? (
                <p className="text-sm text-muted-foreground">Loading passkeys…</p>
              ) : passkeys.length > 0 ? (
                <div className="divide-y divide-border border border-border">
                  {passkeys.map((passkey, index) => (
                    <div className="flex items-center gap-3 p-3" key={passkey.id}>
                      <div className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted/40 text-primary">
                        <KeyRound aria-hidden="true" className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm">Passkey {index + 1}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Added {formatPasskeyDate(passkey.createdAt)} ·{" "}
                          {passkey.synced ? "Available to sync" : "Device-bound"}
                          {passkey.transports.length > 0
                            ? ` · ${passkey.transports.join(", ")}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No passkeys added yet.</p>
              )}
            </section>
          ) : null}

          {identity?.remoteUsername || identity?.username ? (
            <section
              className="space-y-3 border-t border-border pt-4"
              aria-labelledby="logout-heading"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                  session
                </p>
                <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                  /
                </span>
                <h3
                  className="text-[11px] font-normal text-muted-foreground/75"
                  id="logout-heading"
                >
                  Log out
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Disconnect this user identity from this browser. Lists and local data are kept.
              </p>
              {isConfirmingLogOut ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] tracking-[0.08em] text-destructive uppercase">
                    log out of this browser?
                  </span>
                  <Button
                    className="h-8 px-4 text-sm"
                    isDisabled={isLoggingOut}
                    onPress={() => void logOut()}
                    variant="destructive"
                  >
                    {isLoggingOut ? "Logging out…" : "Yes, log out"}
                  </Button>
                  <Button
                    className="h-8 px-4 text-sm"
                    isDisabled={isLoggingOut}
                    onPress={() => setIsConfirmingLogOut(false)}
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  className="h-10 min-w-24 px-5 text-sm"
                  onPress={() => setIsConfirmingLogOut(true)}
                  variant="outline"
                >
                  Log out
                </Button>
              )}
              <FeedbackMessage feedback={feedback} section="logout" />
            </section>
          ) : null}

          {identity?.remoteUsername ? (
            <section
              className="space-y-3 border-t border-border pt-4"
              aria-labelledby="account-heading"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-mono text-[10px] tracking-widest text-destructive uppercase">
                  remote account
                </p>
                <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                  /
                </span>
                <h3
                  className="text-[11px] font-normal text-muted-foreground/75"
                  id="account-heading"
                >
                  Delete user and created lists
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Permanently delete{" "}
                <span className="font-serif font-medium">{identity.remoteUsername}</span> and every
                remote list created by this user. Lists only shared with this user are kept for
                their owners.
              </p>
              {isConfirmingDeleteAccount ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium" htmlFor="delete-remote-user-confirmation">
                    Type <span className="font-serif">{identity.remoteUsername}</span> to confirm
                  </label>
                  <Input
                    autoComplete="off"
                    className="h-10 font-serif text-base sm:text-sm"
                    disabled={isDeletingAccount}
                    id="delete-remote-user-confirmation"
                    onChange={(event) => {
                      setDeleteConfirmation(event.target.value);
                      resetFeedback();
                    }}
                    spellCheck={false}
                    value={deleteConfirmation}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="h-8 px-4 text-sm"
                      isDisabled={
                        isDeletingAccount || deleteConfirmation !== identity.remoteUsername
                      }
                      onPress={() => void deleteAccount()}
                      variant="destructive"
                    >
                      {isDeletingAccount ? "Deleting…" : "Delete remote user"}
                    </Button>
                    <Button
                      className="h-8 px-4 text-sm"
                      isDisabled={isDeletingAccount}
                      onPress={() => {
                        setIsConfirmingDeleteAccount(false);
                        setDeleteConfirmation("");
                      }}
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="h-10 min-w-24 px-5 text-sm"
                  onPress={() => setIsConfirmingDeleteAccount(true)}
                  variant="destructive"
                >
                  Delete remote user
                </Button>
              )}
              <FeedbackMessage feedback={feedback} section="account" />
            </section>
          ) : null}

          <section className="space-y-3 border-t border-border pt-4" aria-labelledby="data-heading">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                local data
              </p>
              <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                /
              </span>
              <h3 className="text-[11px] font-normal text-muted-foreground/75" id="data-heading">
                Clear this browser
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Remove local lists, this browser&apos;s identity, and Keweke&apos;s stored browser
              data. Remote lists are not deleted.
            </p>
            {isConfirmingClearData ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.08em] text-destructive uppercase">
                  clear all local data?
                </span>
                <Button
                  className="h-8 px-4 text-sm"
                  isDisabled={isClearingData}
                  onPress={() => void clearData()}
                  variant="destructive"
                >
                  {isClearingData ? "Clearing…" : "Yes, clear"}
                </Button>
                <Button
                  className="h-8 px-4 text-sm"
                  isDisabled={isClearingData}
                  onPress={() => setIsConfirmingClearData(false)}
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                className="h-10 min-w-24 px-5 text-sm"
                onPress={() => setIsConfirmingClearData(true)}
                variant="destructive"
              >
                Clear data
              </Button>
            )}
            <FeedbackMessage feedback={feedback} section="data" />
          </section>
        </div>
      </Dialog>
    </Modal>
  );

  if (showTrigger) {
    return (
      <DialogTrigger isOpen={isDialogOpen} onOpenChange={setDialogOpen}>
        <Button
          aria-label="User"
          className="inline-flex w-7 sm:w-auto sm:gap-1 sm:px-2"
          size="icon"
          variant="outline"
        >
          <UserRound aria-hidden="true" className="size-3.5" />
          <span className="hidden sm:inline">User</span>
        </Button>
        <ModalOverlay
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-6 pb-6 sm:pt-16 sm:pb-6"
          isDismissable
        >
          {dialogContent}
        </ModalOverlay>
      </DialogTrigger>
    );
  }

  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-6 pb-6 sm:pt-16 sm:pb-6"
      isDismissable
      isOpen={isDialogOpen}
      onOpenChange={setDialogOpen}
    >
      {dialogContent}
    </ModalOverlay>
  );
}
