import { Button, Input } from "@jfa.dev/common/ui";
import { fbs } from "fbtee";
import { UserRound } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "react-aria-components";

import { DocsLink } from "@/app/components/docs-link";
import { kewekeDocs } from "@/app/lib/docs-paths";
import {
  useUserManager,
  type DialogFeedback,
  type FeedbackSection,
} from "@/features/auth/hooks/use-user-manager";

function OrDivider({ size = "default" }: { size?: "default" | "small" }) {
  return (
    <div aria-hidden="true" className="relative flex items-center">
      <hr className="h-px w-full border-0 bg-border" />
      <span
        className={
          size === "small"
            ? "absolute left-1/2 -translate-x-1/2 bg-popover px-1.5 text-xs text-muted-foreground"
            : "absolute left-1/2 -translate-x-1/2 bg-popover px-2 text-xs text-muted-foreground"
        }
      >
        <fbt desc="Divider word between alternative ways to set up a user in the identity dialog">
          or
        </fbt>
      </span>
    </div>
  );
}

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
          ? "text-center text-sm text-destructive"
          : "text-center text-sm text-primary"
      }
    >
      {feedback.text}
    </p>
  );
}

export interface UserDialogProps {
  initialMessageTone?: DialogFeedback["tone"];
  isOpen?: boolean;
  message?: string;
  onOpenChange?: (isOpen: boolean) => void;
  onSaved?: () => void;
  purpose?: "identity" | "publish";
  showTrigger?: boolean;
}

export function UserDialog({
  initialMessageTone = "message",
  isOpen: controlledIsOpen,
  message,
  onOpenChange,
  onSaved,
  purpose = "identity",
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
    initialMessageTone,
    onSaved,
    onNavigateAfterClear: () => {
      setDialogOpen(false);
    },
  });
  const isPublishFlow = purpose === "publish";

  const dialogContent = (
    <Modal className="flex w-full max-w-lg flex-col outline-none max-sm:max-h-[calc(100vh-5.5rem)]">
      <Dialog
        aria-label={fbs(
          "Device identity",
          "Accessible name of the dialog where the user names or pairs this browser",
        )}
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
      >
        <div className="shrink-0 border-b border-border px-4 py-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {isPublishFlow ? (
              <fbt desc="Identity dialog title when the user must set a name before publishing a list">
                Before you publish
              </fbt>
            ) : (
              <fbt desc="Identity dialog title when the user sets up a user for this browser">
                Identify this browser
              </fbt>
            )}
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">
          <section className="space-y-3" aria-labelledby="create-user-heading">
            <div className="space-y-1">
              <h3 className="text-sm font-medium" id="create-user-heading">
                {isPublishFlow ? (
                  <fbt desc="Identity dialog heading for the name field before publishing a list">
                    Choose your name
                  </fbt>
                ) : (
                  <fbt desc="Identity dialog heading for creating a user in this browser">
                    Create a user
                  </fbt>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isPublishFlow ? (
                  <fbt desc="Identity dialog text explaining the chosen name is shown as the list publisher">
                    This name will appear as the publisher of this list. You can change it later.
                  </fbt>
                ) : (
                  <fbt desc="Identity dialog text explaining why to create a user">
                    Publish lists from this browser.
                  </fbt>
                )}
              </p>
            </div>
            <form className="space-y-3" onSubmit={(event) => void save(event)}>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    autoComplete="nickname"
                    className="mt-1.5 h-8 font-serif md:text-sm"
                    disabled={!identity || isSaving}
                    id="user-username"
                    maxLength={48}
                    onChange={(event) => {
                      setValue(event.target.value);
                      resetFeedback();
                    }}
                    placeholder={fbs("Your name", "Placeholder in the empty username input")}
                    value={value}
                  />
                </div>
                <Button
                  className="min-w-24"
                  isDisabled={!identity || isSaving}
                  size="lg"
                  type="submit"
                >
                  {isSaving ? (
                    <fbt desc="Identity dialog name button label while the name is being saved">
                      Saving…
                    </fbt>
                  ) : isPublishFlow ? (
                    <fbt desc="Identity dialog button that saves the name and continues publishing the list">
                      Continue
                    </fbt>
                  ) : (
                    <fbt desc="Identity dialog button that creates a user with the entered name">
                      Create
                    </fbt>
                  )}
                </Button>
              </div>
              <FeedbackMessage feedback={feedback} section="username" />
            </form>
            <p className="flex">
              <DocsLink href={kewekeDocs.createUser} variant="info">
                <fbt desc="Link from the identity dialog to the docs page about user names">
                  How names work
                </fbt>
              </DocsLink>
            </p>
          </section>

          {identity && !identity.remoteUsername ? (
            <section className="space-y-3" aria-labelledby="pair-user-heading">
              <OrDivider />
              <div className="space-y-1">
                <h3 className="text-sm font-medium" id="pair-user-heading">
                  {isPublishFlow ? (
                    <fbt desc="Identity dialog heading for connecting this browser to a user from another device before publishing">
                      Connect another device
                    </fbt>
                  ) : (
                    <fbt desc="Identity dialog heading for connecting this browser to an existing user">
                      Pair a user
                    </fbt>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isPublishFlow ? (
                    <fbt desc="Identity dialog text before publishing, offering to connect this browser to an existing user">
                      Already set up Keweke on another device? Connect this browser with a passkey
                      or pairing code.
                    </fbt>
                  ) : (
                    <fbt desc="Identity dialog text explaining pairing reuses a user from another device">
                      Use an existing user from another device.
                    </fbt>
                  )}
                </p>
              </div>
              {!isPublishFlow ? (
                <p className="text-sm text-muted-foreground">
                  <fbt desc="Identity dialog text offering to connect this browser to a user from another browser">
                    Already have a user on another browser? Connect this one with a passkey or a
                    pairing code.
                  </fbt>
                </p>
              ) : null}
              <p className="flex">
                <DocsLink href={kewekeDocs.identity} variant="info">
                  <fbt desc="Link from the identity dialog to the docs page about pairing browsers">
                    How pairing works
                  </fbt>
                </DocsLink>
              </p>
              <div className="flex flex-col items-stretch gap-3">
                {passkeyAvailable ? (
                  <Button
                    isDisabled={isAdoptingPasskey}
                    onPress={() => void adoptWithPasskey()}
                    size="lg"
                  >
                    {isAdoptingPasskey ? (
                      <fbt desc="Pair with passkey button label while waiting for the browser passkey prompt">
                        Waiting…
                      </fbt>
                    ) : (
                      <fbt desc="Button that connects this browser to a remote user with a saved passkey">
                        Pair with passkey
                      </fbt>
                    )}
                  </Button>
                ) : null}
                {passkeyAvailable ? <OrDivider size="small" /> : null}
                <Button
                  className="min-w-24"
                  isDisabled={isStartingPairing}
                  onPress={() => void startPairing()}
                  size="lg"
                >
                  {isStartingPairing ? (
                    <fbt desc="Show code button label in the identity dialog while the pairing code is being created">
                      Creating…
                    </fbt>
                  ) : (
                    <fbt desc="Identity dialog button that generates a pairing code for this browser">
                      Show code
                    </fbt>
                  )}
                </Button>
              </div>
              <FeedbackMessage feedback={feedback} section="passkey-adoption" />
              <FeedbackMessage feedback={feedback} section="pairing" />
              {pairingCode ? (
                <div className="border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    <fbt desc="Label above the generated pairing code in the identity dialog">
                      Pairing code
                    </fbt>
                  </p>
                  <p className="mt-1 font-mono text-xl tracking-[0.18em] break-all text-primary">
                    {pairingCode}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {pairingStatus?.status === "pending" ? (
                      <fbt desc="Short pairing code status in the identity dialog while waiting for another device to approve it">
                        Waiting…
                      </fbt>
                    ) : pairingStatus?.status === "approved" ? (
                      <fbt desc="Short pairing code status in the identity dialog after another device approved it">
                        Ready.
                      </fbt>
                    ) : pairingStatus?.status === "expired" ? (
                      <fbt desc="Short pairing code status in the identity dialog after the code expired">
                        Expired.
                      </fbt>
                    ) : pairingStatus?.status === "missing" ? (
                      <fbt desc="Short pairing code status in the identity dialog when the server no longer knows the code">
                        Unavailable.
                      </fbt>
                    ) : (
                      <fbt desc="Short pairing code status in the identity dialog while the first status check runs">
                        Checking status…
                      </fbt>
                    )}
                  </p>
                  {pairingStatus?.status === "approved" ? (
                    <Button
                      className="mt-3"
                      isDisabled={isAdopting}
                      onPress={() => void adopt()}
                      size="sm"
                    >
                      {isAdopting ? (
                        <fbt desc="Use this username button label while this browser connects to the approved user">
                          Saving…
                        </fbt>
                      ) : isPublishFlow ? (
                        <fbt desc="Identity dialog button that connects this browser to the approved user and continues publishing">
                          Continue
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
          aria-label={fbs("User", "Accessible label of the button that opens the identity dialog")}
          className="inline-flex w-7 sm:w-auto sm:gap-1 sm:px-2"
          size="icon"
          variant="outline"
        >
          <UserRound aria-hidden="true" className="size-3.5" />
          <span className="hidden sm:inline">
            <fbt desc="Label of the button that opens the identity dialog">User</fbt>
          </span>
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
