import { Button, Input } from "@jfa.dev/common/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, KeyRound, Shield, Smartphone, Trash2 } from "lucide-react";

import { KewekeHeader } from "@/components/keweke-header";
import {
  useUserManager,
  type DialogFeedback,
  type FeedbackSection,
} from "@/hooks/use-user-manager";
import { LOCAL_IDENTITY_PLACEHOLDER } from "@/lib/local-identity";

export const Route = createFileRoute("/user")({
  component: UserRoutePage,
});

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
    <p
      className={
        feedback.tone === "error"
          ? "mt-2 text-sm font-medium text-destructive"
          : "mt-2 text-sm font-medium text-primary"
      }
    >
      {feedback.text}
    </p>
  );
}

function formatPasskeyDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function UserRoutePage() {
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
  } = useUserManager({ isActive: true });

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <KewekeHeader />
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8">
        <section className="invoice-paper invoice-rule mx-auto max-w-3xl border border-t-4 border-t-primary">
          <div className="px-4 py-8 sm:px-8 sm:py-12">
            {/* Navigation & Header */}
            <div className="mb-6">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3" />
                Back to lists
              </Link>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-primary uppercase">
                  device identity
                </p>
                <h1 className="mt-2 text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-5xl">
                  User settings
                </h1>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  {identity?.remoteUsername
                    ? "Remote user"
                    : identity?.username
                      ? "Local user"
                      : "Anonymous"}
                </p>
                <p className="mt-0.5 font-serif text-base font-medium text-foreground sm:text-lg">
                  {identity?.username ?? LOCAL_IDENTITY_PLACEHOLDER}
                </p>
              </div>
            </div>

            {/* Main Content Sections */}
            <div className="divide-y divide-border">
              {/* Section 1: Username */}
              <section className="py-6 sm:py-8" aria-labelledby="username-heading">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                    username
                  </p>
                  <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                    /
                  </span>
                  <h2
                    className="text-[11px] font-normal text-muted-foreground/75"
                    id="username-heading"
                  >
                    Your display name across lists
                  </h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Set the name attached to your list edits and items. Changes sync to all shared
                  lists.
                </p>

                <form className="mt-4 space-y-3" onSubmit={(event) => void save(event)}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
              </section>

              {/* Section 2: Remote Account (if local only) */}
              {identity && !identity.remoteUsername ? (
                <section className="py-6 sm:py-8" aria-labelledby="create-account-heading">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                      remote account
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h2
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="create-account-heading"
                    >
                      Use this user across browsers
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create a remote user with this username so you can pair other browsers and
                    publish lists without creating a list first.
                  </p>
                  <div className="mt-4">
                    <Button
                      className="h-10 min-w-24 px-5 text-sm"
                      isDisabled={isCreatingRemoteUser || isSaving}
                      onPress={() => void createRemoteAccount()}
                    >
                      {isCreatingRemoteUser ? "Creating…" : "Create remote user"}
                    </Button>
                  </div>
                  <FeedbackMessage feedback={feedback} section="account" />
                </section>
              ) : null}

              {/* Section 3: Passkey Adoption (if local only & passkeys available) */}
              {identity && !identity.remoteUsername && passkeyAvailable ? (
                <section className="py-6 sm:py-8" aria-labelledby="passkey-adoption-heading">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                      pair with a passkey
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h2
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="passkey-adoption-heading"
                    >
                      Connect this browser without a code
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use a saved passkey to connect this browser to your existing remote user.
                  </p>
                  <div className="mt-4">
                    <Button
                      className="h-10 gap-1.5 px-5 text-sm"
                      isDisabled={isAdoptingPasskey}
                      onPress={() => void adoptWithPasskey()}
                    >
                      <KeyRound aria-hidden="true" className="size-3.5" />
                      {isAdoptingPasskey ? "Waiting…" : "Pair with passkey"}
                    </Button>
                  </div>
                  <FeedbackMessage feedback={feedback} section="passkey-adoption" />
                </section>
              ) : null}

              {/* Section 4: Pair a Browser (Initiate pairing) */}
              {identity && !identity.remoteUsername ? (
                <section className="py-6 sm:py-8" aria-labelledby="pairing-heading">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                      pair a browser
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h2
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="pairing-heading"
                    >
                      Use on another device
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Generate a pairing code in this browser and approve it from an existing accepted
                    device.
                  </p>
                  <div className="mt-4">
                    <Button
                      className="h-10 min-w-24 px-5 text-sm"
                      isDisabled={!identity || isStartingPairing}
                      onPress={() => void startPairing()}
                    >
                      {isStartingPairing ? "Creating…" : "Show pairing code"}
                    </Button>
                  </div>
                  <FeedbackMessage feedback={feedback} section="pairing" />

                  {pairingCode ? (
                    <div className="mt-4 border border-border bg-muted/40 p-4">
                      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                        pairing code
                      </p>
                      <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em] break-all text-primary sm:text-3xl">
                        {pairingCode}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {pairingStatus?.status === "pending"
                          ? "Waiting for approval on your other device…"
                          : pairingStatus?.status === "approved"
                            ? "Device approved! Ready to connect."
                            : pairingStatus?.status === "expired"
                              ? "Pairing code has expired. Please create a new one."
                              : pairingStatus?.status === "missing"
                                ? "Pairing code is unavailable or expired."
                                : "Checking pairing status…"}
                      </p>
                      {pairingStatus?.status === "approved" ? (
                        <Button
                          className="mt-3"
                          isDisabled={isAdopting}
                          onPress={() => void adopt()}
                        >
                          <Check className="size-3.5" />
                          {isAdopting ? "Saving…" : "Use this username"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {/* Section 5: Approve a Browser (Authorize pairing) */}
              {identity?.remoteUsername ? (
                <section className="py-6 sm:py-8" aria-labelledby="approve-heading">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                      approve a browser
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h2
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="approve-heading"
                    >
                      Add another device
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Enter the ten-character pairing code shown on another device to authorize it.
                  </p>
                  <form
                    className="mt-4 flex max-w-md gap-2"
                    onSubmit={(event) => void findDevice(event)}
                  >
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
                    <div className="mt-4 border border-border bg-muted/40 p-4">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-4 text-primary" />
                        <p className="text-sm font-medium">A new device is waiting for approval.</p>
                      </div>
                      <Button
                        className="mt-3"
                        isDisabled={isApproving}
                        onPress={() => void approve()}
                      >
                        <Shield className="size-3.5" />
                        {isApproving ? "Approving…" : "Approve device"}
                      </Button>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {/* Section 6: Accepted Devices */}
              {profile ? (
                <section className="py-6 sm:py-8" aria-labelledby="devices-heading">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                      accepted devices
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h2
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="devices-heading"
                    >
                      Manage devices
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Every active device that can sign mutations and approve other devices for this
                    user.
                  </p>
                  <div className="mt-4 divide-y divide-border border border-border">
                    {profile.devices.map((device) => (
                      <div
                        className="flex items-center justify-between gap-3 p-3 sm:p-4"
                        key={device.deviceId}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {device.deviceId === identity?.deviceId
                              ? "This device"
                              : "Other device"}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {device.deviceId.slice(0, 16)}… ·{" "}
                            {device.revokedAt ? (
                              <span className="text-destructive">Revoked</span>
                            ) : (
                              <span className="text-primary">Active</span>
                            )}
                          </p>
                        </div>
                        {device.revokedAt === null ? (
                          confirmingDeviceId === device.deviceId ? (
                            <div className="flex shrink-0 gap-1.5">
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

              {/* Section 7: Passkeys */}
              {canManagePasskeys ? (
                <section className="py-6 sm:py-8" aria-labelledby="passkeys-heading">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                      passkeys
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h2
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="passkeys-heading"
                    >
                      Sign in without pairing codes
                    </h2>
                  </div>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <p className="min-w-0 text-sm text-muted-foreground">
                      Add passkeys to this user. Each passkey can instantly adopt a new browser
                      without generating pairing codes.
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
                    <p className="mt-2 text-sm text-muted-foreground">
                      Passkeys are not available in this browser.
                    </p>
                  ) : null}
                  <FeedbackMessage feedback={feedback} section="passkeys" />

                  {isLoadingPasskeys ? (
                    <p className="mt-4 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                      Loading passkeys…
                    </p>
                  ) : passkeys.length > 0 ? (
                    <div className="mt-4 divide-y divide-border border border-border">
                      {passkeys.map((passkey, index) => (
                        <div className="flex items-center gap-3 p-3 sm:p-4" key={passkey.id}>
                          <div className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted/40 text-primary">
                            <KeyRound aria-hidden="true" className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Passkey {index + 1}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
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
                    <p className="mt-4 text-sm text-muted-foreground">No passkeys added yet.</p>
                  )}
                </section>
              ) : null}

              {/* Section 8: Session / Log out */}
              {identity?.remoteUsername || identity?.username ? (
                <section className="py-6 sm:py-8" aria-labelledby="logout-heading">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                      session
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h2
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="logout-heading"
                    >
                      Log out
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Disconnect this user identity from this browser. Lists and local data are
                    retained.
                  </p>
                  <div className="mt-4">
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
                  </div>
                  <FeedbackMessage feedback={feedback} section="logout" />
                </section>
              ) : null}

              {/* Section 9: Remote Account Deletion */}
              {identity?.remoteUsername ? (
                <section className="py-6 sm:py-8" aria-labelledby="account-heading">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-widest text-destructive uppercase">
                      remote account
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h2
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="account-heading"
                    >
                      Delete user and created lists
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Permanently delete{" "}
                    <span className="font-serif font-medium text-foreground">
                      {identity.remoteUsername}
                    </span>{" "}
                    and every remote list created by this user. Lists only shared with this user are
                    kept for their owners.
                  </p>
                  <div className="mt-4">
                    {isConfirmingDeleteAccount ? (
                      <div className="max-w-md space-y-3">
                        <label
                          className="text-xs font-medium"
                          htmlFor="delete-remote-user-confirmation"
                        >
                          Type{" "}
                          <span className="font-serif font-bold">{identity.remoteUsername}</span> to
                          confirm deletion
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
                            <Trash2 className="size-3.5" />
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
                  </div>
                  <FeedbackMessage feedback={feedback} section="account" />
                </section>
              ) : null}

              {/* Section 10: Local Data / Reset Browser */}
              <section className="py-6 sm:py-8" aria-labelledby="data-heading">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                    local data
                  </p>
                  <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                    /
                  </span>
                  <h2
                    className="text-[11px] font-normal text-muted-foreground/75"
                    id="data-heading"
                  >
                    Clear this browser
                  </h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Remove local lists, this browser&apos;s identity, and Keweke&apos;s stored browser
                  data. Remote lists are not deleted.
                </p>
                <div className="mt-4">
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
                        <Trash2 className="size-3.5" />
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
                </div>
                <FeedbackMessage feedback={feedback} section="data" />
              </section>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
