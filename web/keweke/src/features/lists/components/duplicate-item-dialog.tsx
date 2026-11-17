import { Button } from "@jfa.dev/common/ui";
import { fbs } from "fbtee";
import { PackageCheck } from "lucide-react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

import { DocsLink } from "@/app/components/docs-link";
import { kewekeDocs } from "@/app/lib/docs-paths";
import type { NewItemDraft } from "@/features/lists/components/list-item-types";
import type { InventoryMatch } from "@/features/lists/lib/inventory-match";

function describeMeasure(quantity: string, unit: string): string {
  const trimmedUnit = unit.trim();
  return trimmedUnit ? `${quantity.trim()} ${trimmedUnit}` : quantity.trim();
}

export function DuplicateItemDialog({
  draft,
  isOpen,
  isAdding,
  match,
  onAddAnyway,
  onOpenChange,
}: {
  draft: NewItemDraft;
  isOpen: boolean;
  isAdding: boolean;
  match: InventoryMatch;
  onAddAnyway: () => void;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const existing = match.item;

  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      isDismissable={!isAdding}
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!isAdding || nextIsOpen) {
          onOpenChange(nextIsOpen);
        }
      }}
    >
      <Modal className="w-full max-w-md outline-none">
        <Dialog
          aria-label={fbs(
            "Item already in inventory",
            "Accessible label of the dialog asking whether to add an item that already seems to be in inventory",
          )}
          className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-4">
            <PackageCheck aria-hidden="true" className="size-4 shrink-0 text-warning" />
            <h2 className="text-lg font-semibold tracking-tight">
              <fbt desc="Title of the dialog asking whether to add an item that already seems to be in inventory">
                Already in inventory?
              </fbt>
            </h2>
          </div>

          <div className="space-y-5 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              <fbt desc="Explanation in the dialog shown when a new item seems to already be in inventory">
                This looks like something you already have.
              </fbt>{" "}
              <DocsLink className="align-baseline" href={kewekeDocs.duplicateItemDialog}>
                <fbt desc="Link to the documentation about the inventory duplicate check">
                  How the check works
                </fbt>
              </DocsLink>
            </p>

            <div className="space-y-2 border border-border bg-muted/40 p-3 text-sm">
              <div className="flex gap-3">
                <span className="w-20 shrink-0 text-muted-foreground">
                  <fbt desc="Label for the item being added, in the dialog comparing it with an inventory item">
                    Adding
                  </fbt>
                </span>
                <span className="min-w-0 font-medium">
                  {draft.name.trim()}
                  <span className="ml-1 font-mono text-xs text-muted-foreground">
                    {describeMeasure(draft.quantity, draft.unit)}
                  </span>
                </span>
              </div>
              {existing ? (
                <div className="flex gap-3">
                  <span className="w-20 shrink-0 text-muted-foreground">
                    <fbt desc="Label for the matching inventory item, in the dialog comparing it with the item being added">
                      Inventory
                    </fbt>
                  </span>
                  <span className="min-w-0 font-medium">
                    {existing.name}
                    <span className="ml-1 font-mono text-xs text-muted-foreground">
                      {describeMeasure(String(existing.quantity), existing.unit)}
                    </span>
                  </span>
                </div>
              ) : null}
            </div>

            <p className="text-sm leading-6 text-muted-foreground">
              <fbt desc="Advice in the dialog shown when a new item seems to already be in inventory">
                Add it anyway if this is a different product or you need more.
              </fbt>
            </p>

            <div className="flex justify-end gap-2">
              <Button isDisabled={isAdding} onPress={() => onOpenChange(false)} variant="ghost">
                <fbt desc="Button that cancels adding an item that seems to already be in inventory">
                  Cancel
                </fbt>
              </Button>
              <Button isDisabled={isAdding} onPress={onAddAnyway}>
                <fbt desc="Button that adds an item even though it seems to already be in inventory">
                  Add anyway
                </fbt>
              </Button>
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
