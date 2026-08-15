import { Button, Input } from "@jfa.dev/common/ui";
import { UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "react-aria-components";

import {
  ensureLocalIdentity,
  LOCAL_IDENTITY_PLACEHOLDER,
  saveLocalIdentity,
  subscribeToLocalIdentity,
  type LocalIdentity,
} from "@/lib/local-identity";

export function UserDialog() {
  const [identity, setIdentity] = useState<LocalIdentity>();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const refreshIdentity = (): void => setIdentity(ensureLocalIdentity());
    refreshIdentity();
    return subscribeToLocalIdentity(refreshIdentity);
  }, []);

  const save = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const username = value.trim();
    if (!username) {
      setError("Use a username between 1 and 48 characters.");
      return;
    }

    setIsSaving(true);
    try {
      const nextIdentity = saveLocalIdentity(username);
      setIdentity(nextIdentity);
      setValue(nextIdentity.username ?? "");
      setError(undefined);
    } catch {
      setError("Use a username between 1 and 48 characters.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        if (isOpen) {
          const currentIdentity = identity ?? ensureLocalIdentity();
          setIdentity(currentIdentity);
          setValue(currentIdentity.username ?? "");
          setError(undefined);
        } else {
          setError(undefined);
        }
      }}
    >
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
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-16 sm:pt-20"
        isDismissable
      >
        <Modal className="w-full max-w-sm outline-none">
          <Dialog
            aria-label="Your user"
            className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
          >
            <div className="border-b border-border px-4 py-4">
              <p className="font-mono text-[10px] tracking-[0.12em] text-primary uppercase">
                local user
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">Your user</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose the name people will see beside your list changes.
              </p>
            </div>
            <form className="space-y-4 p-4" onSubmit={save}>
              <div>
                <label className="text-xs font-medium" htmlFor="user-username">
                  Username
                </label>
                <Input
                  autoComplete="nickname"
                  className="mt-1.5 h-10 text-base sm:text-sm"
                  disabled={!identity || isSaving}
                  id="user-username"
                  maxLength={48}
                  onChange={(event) => {
                    setValue(event.target.value);
                    setError(undefined);
                  }}
                  placeholder={LOCAL_IDENTITY_PLACEHOLDER}
                  value={value}
                />
              </div>
              {identity ? (
                <div className="border-t border-border pt-3">
                  <p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                    User ID
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">{identity.id}</p>
                </div>
              ) : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end">
                <Button isDisabled={!identity || isSaving} type="submit">
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
