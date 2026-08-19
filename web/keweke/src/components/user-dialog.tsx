import { Button, Input } from "@jfa.dev/common/ui";
import { UserRound } from "lucide-react";
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
    value,
    setValue,
    pairingCode,
    pairingStatus,
    feedback,
    resetFeedback,
    isSaving,
    isStartingPairing,
    isAdoptingPasskey,
    isAdopting,
    passkeyAvailable,
    save,
    startPairing,
    adoptWithPasskey,
    adopt,
  } = useUserManager({
    isActive: isDialogOpen,
    initialMessage: message,
    onSaved,
    onNavigateAfterClear: () => {
      setDialogOpen(false);
    },
  });

  const dialogContent = (
    <Modal className="flex w-full max-w-lg flex-col outline-none max-sm:max-h-[calc(100vh-5.5rem)]">
      <Dialog
        aria-label="Device identity"
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
      >
        <div className="shrink-0 border-b border-border px-4 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-mono text-[10px] tracking-[0.12em] text-primary uppercase">
              device identity
            </p>
            <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
              /
            </span>
            <h3
              className="text-[11px] font-normal text-muted-foreground/75"
              id="create-user-heading"
            >
              Identify yourself
            </h3>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">
          <section className="space-y-3" aria-labelledby="create-user-heading">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                create a user
              </p>
              <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                /
              </span>
              <h3
                className="text-[11px] font-normal text-muted-foreground/75"
                id="create-user-heading"
              >
                Publish lists from this browser
              </h3>
            </div>
            <form className="space-y-3" onSubmit={(event) => void save(event)}>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    autoComplete="nickname"
                    className="mt-1.5 h-10 font-serif text-base sm:text-sm"
                    disabled={!identity || isSaving}
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
                  isDisabled={!identity || isSaving}
                  type="submit"
                >
                  {isSaving ? "Creating…" : "Create"}
                </Button>
              </div>
              <FeedbackMessage feedback={feedback} section="username" />
            </form>
          </section>

          {identity && !identity.remoteUsername ? (
            <section
              className="space-y-3 border-t border-border pt-4"
              aria-labelledby="pair-user-heading"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                  pair a user
                </p>
                <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                  /
                </span>
                <h3
                  className="text-[11px] font-normal text-muted-foreground/75"
                  id="pair-user-heading"
                >
                  Use an existing user from another device
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Already have a user on another browser? Connect this one with a passkey or a pairing
                code.
              </p>
              <div className="flex flex-wrap gap-x-1">
                {passkeyAvailable ? (
                  <Button
                    className="h-10 gap-1.5 px-5 text-sm"
                    isDisabled={isAdoptingPasskey}
                    onPress={() => void adoptWithPasskey()}
                  >
                    {isAdoptingPasskey ? "Waiting…" : "Pair with passkey"}
                  </Button>
                ) : null}
                <Button
                  className="h-10 min-w-24 px-5 text-sm"
                  isDisabled={isStartingPairing}
                  onPress={() => void startPairing()}
                >
                  {isStartingPairing ? "Creating…" : "Show code"}
                </Button>
              </div>
              <FeedbackMessage feedback={feedback} section="passkey-adoption" />
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
