import { Button } from "@jfa.dev/common/ui";
import { fbs } from "fbtee";
import type { ReactNode } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

import { DocsLink } from "@/app/components/docs-link";
import { HotkeyKbd } from "@/app/components/hotkey-kbd";
import { kewekeDocs } from "@/app/lib/docs-paths";

interface ItemEntryHelpDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ItemEntryHelpDialog({ isOpen, onOpenChange }: ItemEntryHelpDialogProps) {
  const fieldLabels = {
    item: fbs("item", "Short label for the item name field, shown in the how-to-add-items help"),
    qty: fbs("qty", "Short label for the item quantity field, shown in the how-to-add-items help"),
    unit: fbs(
      "unit",
      "Short label for the item unit field (box, bag, kg), shown in the how-to-add-items help",
    ),
    each: fbs(
      "each",
      "Short label for the field saying what one unit contains (3 bags per box), shown in the how-to-add-items help",
    ),
    category: fbs(
      "category",
      "Short label for the item category field, shown in the how-to-add-items help",
    ),
  };

  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      isDismissable
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal className="w-full max-w-md outline-none">
        <Dialog
          aria-label={fbs(
            "How to add items",
            "Accessible label of the how-to-add-items help dialog",
          )}
          className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
        >
          <div className="border-b border-border px-4 py-4">
            <h2 className="text-lg font-semibold tracking-tight">
              <fbt desc="Title of the help dialog explaining how to add items to a list">
                How to add items
              </fbt>
            </h2>
          </div>

          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              <fbt desc="Intro of the how-to-add-items help dialog, introducing the microwave popcorn example">
                Each new line is one thing you buy. Take microwave popcorn: you buy a box, and
                inside every box there are 3 bags.
              </fbt>
            </p>

            <div className="space-y-2 border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                <fbt desc="Title of the example item in the how-to-add-items help">
                  Microwave popcorn
                </fbt>
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                <ExampleField
                  label={fieldLabels.item}
                  value={fbs("popcorn", "Example item name in the how-to-add-items help")}
                />
                <ExampleField label={fieldLabels.qty} value="1" />
                <ExampleField
                  label={fieldLabels.unit}
                  value={fbs("box", "Example item unit in the how-to-add-items help")}
                />
                <ExampleField
                  label={fieldLabels.each}
                  value={fbs(
                    "3 bags",
                    "Example of what one unit contains (one box holds 3 bags) in the how-to-add-items help",
                  )}
                />
                <ExampleField
                  label={fieldLabels.category}
                  value={fbs("snacks", "Example item category in the how-to-add-items help")}
                />
              </div>
              <p className="border-t border-border pt-2 text-xs text-muted-foreground">
                <fbt desc="How the example item (1 box of microwave popcorn holding 3 bags) appears in the list, in the how-to-add-items help">
                  Shows as{" "}
                  <span className="text-foreground">
                    <span className="font-mono">1</span> <span className="font-serif">box</span> ({" "}
                    <span className="font-serif">3 bags</span>{" "}
                    <span className="font-mono">each</span>)
                  </span>
                </fbt>
              </p>
            </div>

            <ul className="space-y-2.5 text-sm leading-snug">
              <FieldGuide
                term={fieldLabels.item}
                note={fbs(
                  "what you're buying — required",
                  "Explains the item name field in the how-to-add-items help",
                )}
              >
                <fbt desc="Example value for the item name field in the how-to-add-items help">
                  e.g. microwave popcorn
                </fbt>
              </FieldGuide>
              <FieldGuide
                term={fieldLabels.qty}
                note={fbs(
                  "how many of the unit — defaults to 1",
                  "Explains the item quantity field in the how-to-add-items help",
                )}
              >
                <fbt desc="Example value for the item quantity field in the how-to-add-items help">
                  e.g. 2 boxes
                </fbt>
              </FieldGuide>
              <FieldGuide
                term={fieldLabels.unit}
                note={fbs(
                  "how it's sold — required",
                  "Explains the item unit field in the how-to-add-items help",
                )}
              >
                <fbt desc="Example values for the item unit field in the how-to-add-items help">
                  e.g. box, bag, jar, kg, pack
                </fbt>
              </FieldGuide>
              <FieldGuide
                term={fieldLabels.each}
                note={fbs(
                  "what one unit contains — optional",
                  "Explains the field saying what one unit contains in the how-to-add-items help",
                )}
              >
                <fbt desc="Example value for the field saying what one unit contains, in the how-to-add-items help">
                  e.g. 3 bags per box
                </fbt>
              </FieldGuide>
              <FieldGuide
                term={fieldLabels.category}
                note={fbs(
                  "groups similar items — defaults to GENERAL",
                  "Explains the item category field in the how-to-add-items help; GENERAL is the default category name",
                )}
              >
                <fbt desc="Example value for the item category field in the how-to-add-items help">
                  e.g. snacks
                </fbt>
              </FieldGuide>
            </ul>

            <div className="space-y-2 border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium">
                <fbt desc="Heading of the help section about the inventory duplicate check">
                  Already in inventory
                </fbt>
              </p>
              <p className="text-sm leading-snug text-muted-foreground">
                <fbt desc="Help text about the inventory duplicate check; 'Add anyway' is the button that adds the item regardless">
                  As you type, KEWEKE checks the name against the items already in this list&apos;s
                  Inventory. If they look like the same thing, a note appears under the field and
                  the first add asks before committing. Nothing is blocked — pick{" "}
                  <span className="text-foreground">Add anyway</span> if it&apos;s a different
                  product or you just need more.
                </fbt>
              </p>
            </div>

            <div className="hidden space-y-2 border border-border bg-muted/40 p-3 md:block">
              <p className="text-sm font-medium">
                <fbt desc="Heading of the help section about the spreadsheet editing mode">
                  Spreadsheet
                </fbt>
              </p>
              <p className="text-sm leading-snug text-muted-foreground">
                <fbt desc="Help text on how to open the spreadsheet editing mode; the parameter is a keyboard shortcut">
                  On desktop, use the grid button or{" "}
                  <fbt:param name="spreadsheetShortcut">
                    <HotkeyKbd hotkey="Mod+Shift+E" />
                  </fbt:param>{" "}
                  to edit every row with the keyboard.
                </fbt>
              </p>
              <p className="text-sm leading-snug text-muted-foreground">
                <fbt desc="Help text on keyboard navigation in the spreadsheet editing mode; Tab, Enter and Escape are keyboard keys and the parameter is a keyboard shortcut">
                  <span className="text-foreground">Tab</span> moves across fields, arrows move
                  between cells, Enter moves down, and{" "}
                  <fbt:param name="removeRowShortcut">
                    <HotkeyKbd hotkey="Mod+Backspace" />
                  </fbt:param>{" "}
                  removes the current row. Escape exits.
                </fbt>
              </p>
            </div>

            <div className="space-y-2 border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium">
                <fbt desc="Heading of the help section about keyboard shortcuts">Shortcuts</fbt>
              </p>
              <p className="text-sm leading-snug text-muted-foreground">
                <fbt desc="Help text about list keyboard shortcuts; the parameters are keyboard keys">
                  <fbt:param name="searchShortcut">
                    <HotkeyKbd hotkey="F" />
                  </fbt:param>{" "}
                  focuses search,{" "}
                  <fbt:param name="newItemShortcut">
                    <HotkeyKbd hotkey="N" />
                  </fbt:param>{" "}
                  jumps to the new item name. Both work in list and spreadsheet mode and avoid
                  browser shortcuts like new tab or new window.
                </fbt>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <DocsLink href={kewekeDocs.workingWithList}>
                <fbt desc="Link in the how-to-add-items help to the documentation page about working with a list">
                  Working with the list
                </fbt>
              </DocsLink>
              <span
                aria-hidden="true"
                className="hidden text-xs text-muted-foreground/50 sm:inline"
              >
                ·
              </span>
              <DocsLink className="hidden sm:inline-flex" href={kewekeDocs.duplicateItemDialog}>
                <fbt desc="Link in the how-to-add-items help to the documentation page about the inventory duplicate check">
                  Inventory check
                </fbt>
              </DocsLink>
              <span
                aria-hidden="true"
                className="hidden text-xs text-muted-foreground/50 sm:inline"
              >
                ·
              </span>
              <DocsLink
                className="hidden sm:inline-flex"
                href={kewekeDocs.workingWithListSpreadsheet}
              >
                <fbt desc="Link in the how-to-add-items help to the documentation page about the spreadsheet editing mode">
                  Spreadsheet mode
                </fbt>
              </DocsLink>
            </div>
            <Button onPress={() => onOpenChange(false)} variant="outline">
              <fbt desc="Button that closes the how-to-add-items help dialog">Close</fbt>
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function ExampleField({ label, value }: { label: string; value: string }) {
  return (
    <p className="min-w-0">
      <span className="type-label text-muted-foreground">{label}</span>
      <span className="ml-2 font-serif wrap-break-word text-primary">{value}</span>
    </p>
  );
}

function FieldGuide({ children, note, term }: { children: ReactNode; note: string; term: string }) {
  return (
    <li className="flex gap-2">
      <span className="w-14 shrink-0 type-label text-primary">{term}</span>
      <span className="min-w-0 text-muted-foreground">
        {note}. <span className="text-foreground">{children}</span>
      </span>
    </li>
  );
}
