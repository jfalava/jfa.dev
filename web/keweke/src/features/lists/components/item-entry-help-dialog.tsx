import { Button } from "@jfa.dev/common/ui";
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
  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      isDismissable
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal className="w-full max-w-md outline-none">
        <Dialog
          aria-label="How to add items"
          className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
        >
          <div className="border-b border-border px-4 py-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[10px] tracking-[0.12em] text-primary uppercase">
                new item fields
              </p>
              <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                /
              </span>
              <h2 className="text-[11px] font-normal text-muted-foreground/75">
                How to fill a row
              </h2>
            </div>
          </div>

          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Each new line is one thing you buy. Take microwave popcorn: you buy a box, and inside
              every box there are 3 bags.
            </p>

            <div className="space-y-2 border border-border bg-muted/40 p-3">
              <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                example — microwave popcorn
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                <ExampleField label="item" value="popcorn" />
                <ExampleField label="qty" value="1" />
                <ExampleField label="unit" value="box" />
                <ExampleField label="each" value="3 bags" />
                <ExampleField label="category" value="snacks" />
              </div>
              <p className="border-t border-border pt-2 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                shows as{" "}
                <span className="text-foreground">
                  <span className="font-mono">1</span> <span className="font-serif">box</span> ({" "}
                  <span className="font-serif">3 bags</span> <span className="font-mono">each</span>
                  )
                </span>
              </p>
            </div>

            <ul className="space-y-2.5 text-[13px] leading-snug">
              <FieldGuide term="item" note="what you're buying — required">
                e.g. microwave popcorn
              </FieldGuide>
              <FieldGuide term="qty" note="how many of the unit — defaults to 1">
                e.g. 2 boxes
              </FieldGuide>
              <FieldGuide term="unit" note="how it's sold — required">
                e.g. box, bag, jar, kg, pack
              </FieldGuide>
              <FieldGuide term="each" note="what one unit contains — optional">
                e.g. 3 bags per box
              </FieldGuide>
              <FieldGuide term="category" note="groups similar items — defaults to GENERAL">
                e.g. snacks
              </FieldGuide>
            </ul>

            <div className="hidden space-y-2 border border-primary/20 bg-primary/5 p-3 md:block">
              <p className="font-mono text-[10px] tracking-[0.08em] text-primary uppercase">
                spreadsheet mode
              </p>
              <p className="text-[13px] leading-snug text-muted-foreground">
                On desktop, use the grid button or <HotkeyKbd hotkey="Mod+Shift+E" /> to edit every
                row with the keyboard.
              </p>
              <p className="text-[13px] leading-snug text-muted-foreground">
                <span className="text-foreground">Tab</span> moves across fields, arrows move
                between cells, Enter moves down, and <HotkeyKbd hotkey="Mod+Backspace" /> removes
                the current row. Escape exits.
              </p>
            </div>

            <div className="space-y-2 border border-border bg-muted/40 p-3">
              <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                quick focus
              </p>
              <p className="text-[13px] leading-snug text-muted-foreground">
                <HotkeyKbd hotkey="F" /> focuses search, <HotkeyKbd hotkey="N" /> jumps to the new
                item name. Both work in list and spreadsheet mode and avoid browser shortcuts like
                new tab or new window.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <DocsLink href={kewekeDocs.workingWithList}>Working with the list</DocsLink>
              <span aria-hidden="true" className="hidden text-[10px] text-muted-foreground/50 sm:inline">
                ·
              </span>
              <DocsLink className="hidden sm:inline-flex" href={kewekeDocs.workingWithListSpreadsheet}>
                Spreadsheet mode
              </DocsLink>
            </div>
            <Button onPress={() => onOpenChange(false)}>Got it</Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function ExampleField({ label, value }: { label: string; value: string }) {
  return (
    <p className="min-w-0">
      <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span className="ml-2 font-serif break-words text-primary">{value}</span>
    </p>
  );
}

function FieldGuide({ children, note, term }: { children: ReactNode; note: string; term: string }) {
  return (
    <li className="flex gap-2">
      <span className="w-14 shrink-0 font-mono text-[10px] tracking-[0.08em] text-primary uppercase">
        {term}
      </span>
      <span className="min-w-0 text-muted-foreground">
        {note}. <span className="text-foreground">{children}</span>
      </span>
    </li>
  );
}
