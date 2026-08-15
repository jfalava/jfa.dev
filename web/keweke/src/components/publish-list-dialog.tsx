import { Button } from "@jfa.dev/common/ui";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

interface PublishListDialogProps {
  alias: string | null;
  isOpen: boolean;
  listId: string;
  onConfirm: () => void;
  onOpenChange: (isOpen: boolean) => void;
}

export function PublishListDialog({
  alias,
  isOpen,
  listId,
  onConfirm,
  onOpenChange,
}: PublishListDialogProps) {
  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      isDismissable
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal className="w-full max-w-md outline-none">
        <Dialog
          aria-label="Publish list"
          className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
        >
          <div className="border-b border-border px-4 py-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[10px] tracking-[0.12em] text-primary uppercase">
                publish to remote
              </p>
              <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                /
              </span>
              <h2 className="text-[11px] font-normal text-muted-foreground/75">
                Make this list public?
              </h2>
            </div>
          </div>

          <div className="space-y-5 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Publishing this list will make it public and accessible online. Anyone with its ID or
              alias can open it.
            </p>

            <div className="space-y-2 border border-border bg-muted/40 p-3 text-[11px]">
              <p className="tracking-widest text-muted-foreground uppercase">public addresses</p>
              <div className="flex gap-3">
                <span className="w-12 shrink-0 text-muted-foreground uppercase">id</span>
                <span className="min-w-0 font-mono break-all text-primary">{listId}</span>
              </div>
              {alias ? (
                <div className="flex gap-3">
                  <span className="w-12 shrink-0 text-muted-foreground uppercase">alias</span>
                  <span className="min-w-0 font-mono break-all text-primary">{alias}</span>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button onPress={() => onOpenChange(false)} variant="ghost">
                Cancel
              </Button>
              <Button onPress={onConfirm}>Publish list</Button>
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
