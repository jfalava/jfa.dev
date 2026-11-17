import { Button } from "@jfa.dev/common/ui";
import { fbs } from "fbtee";
import { RefreshCw } from "lucide-react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

import { DocsLink } from "@/app/components/docs-link";
import { kewekeDocs } from "@/app/lib/docs-paths";

interface PublishListDialogProps {
  alias: string | null;
  error?: string;
  isOpen: boolean;
  isPublishing: boolean;
  listId: string;
  onConfirm: () => void;
  onOpenChange: (isOpen: boolean) => void;
  willCreateRemoteUser: boolean;
}

export function PublishListDialog({
  alias,
  error,
  isOpen,
  isPublishing,
  listId,
  onConfirm,
  onOpenChange,
  willCreateRemoteUser,
}: PublishListDialogProps) {
  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      isDismissable={!isPublishing}
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!isPublishing || nextIsOpen) {
          onOpenChange(nextIsOpen);
        }
      }}
    >
      <Modal className="w-full max-w-md outline-none">
        <Dialog
          aria-label={fbs(
            "Publish list",
            "Accessible label of the dialog that confirms publishing a local list",
          )}
          className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
        >
          <div className="border-b border-border px-4 py-4">
            <h2 className="text-lg font-semibold tracking-tight">
              <fbt desc="Title of the dialog that confirms publishing a local list so others can open it">
                Publish this list?
              </fbt>
            </h2>
          </div>

          <div className="space-y-5 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              <fbt desc="Explanation in the publish-list dialog of who can open a published list">
                Anyone with the ID or alias can open it.
              </fbt>{" "}
              <DocsLink className="align-baseline" href={kewekeDocs.publishListDialog}>
                <fbt desc="Link from the publish-list dialog to the documentation about publishing">
                  Publishing a list
                </fbt>
              </DocsLink>
            </p>

            {willCreateRemoteUser ? (
              <p className="border border-primary/30 bg-primary/5 p-3 text-sm leading-5 text-foreground">
                <fbt desc="Note in the publish-list dialog when publishing also creates the user's account">
                  This list will be available on other devices, and you’ll be able to edit it there.
                </fbt>
              </p>
            ) : null}

            <div className="space-y-2 border border-border bg-muted/40 p-3 text-sm">
              <div className="flex gap-3">
                <span className="w-12 shrink-0 text-muted-foreground">
                  <fbt desc="Label before the list ID in the publish-list dialog">ID</fbt>
                </span>
                <span className="min-w-0 font-mono break-all">{listId}</span>
              </div>
              {alias ? (
                <div className="flex gap-3">
                  <span className="w-12 shrink-0 text-muted-foreground">
                    <fbt desc="Label before the list alias (a readable name used in its address) in the publish-list dialog">
                      Alias
                    </fbt>
                  </span>
                  <span className="min-w-0 font-mono break-all">{alias}</span>
                </div>
              ) : null}
            </div>

            {error ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button isDisabled={isPublishing} onPress={() => onOpenChange(false)} variant="ghost">
                <fbt desc="Button that closes the publish-list dialog without publishing">
                  Cancel
                </fbt>
              </Button>
              <Button isDisabled={isPublishing} onPress={onConfirm}>
                {isPublishing ? (
                  <RefreshCw aria-hidden="true" className="size-3.5 animate-spin" />
                ) : null}
                {isPublishing ? (
                  <fbt desc="Button label while a list is being published">Publishing…</fbt>
                ) : (
                  <fbt desc="Button that confirms publishing a local list">Publish list</fbt>
                )}
              </Button>
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
