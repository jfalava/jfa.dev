import { Button } from "@jfa.dev/common/ui";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

import { HotkeyKbd } from "@/components/hotkey-kbd";
import { CATEGORY_ORDER, SHORTCUT_BY_CATEGORY, type PhotoshopShortcut } from "@/editor/keymap";

interface ShortcutGuideProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ShortcutGuide({ isOpen, onOpenChange }: ShortcutGuideProps) {
  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]"
      isDismissable
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal className="w-full max-w-3xl outline-none">
        <Dialog
          aria-label="Keyboard shortcuts"
          className="overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none"
        >
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[11px] tracking-[0.14em] text-primary uppercase">Shortcuts</p>
              <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                /
              </span>
              <h2 className="text-[11px] font-normal text-muted-foreground/75">Photoshop map</h2>
              <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
                Hold <HotkeyKbd hotkey="?" /> to preview
                <span className="mx-1 text-muted-foreground/50">•</span>
                <HotkeyKbd hotkey="Escape" /> to close
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Every tool and action mirrors Photoshop. Single keys switch tools,{" "}
              <span className="text-foreground">Alt</span> combos handle file and edit to avoid
              browser clashes (<span className="text-foreground">Mod</span> only for
              undo/redo/duplicate/zoom). Works only when not typing in an input.
            </p>
          </div>

          <div className="max-h-[68vh] overflow-y-auto p-5">
            <div className="grid gap-6 md:grid-cols-2">
              {CATEGORY_ORDER.map((category) => {
                const shortcuts = SHORTCUT_BY_CATEGORY[category];
                if (!shortcuts || shortcuts.length === 0) {
                  return null;
                }
                return (
                  <section key={category} className="space-y-3">
                    <h3 className="flex items-center gap-2 border-b border-border pb-2 font-mono text-[11px] tracking-[0.08em] text-primary uppercase">
                      {category}
                      <span className="ml-auto font-mono text-[10px] font-normal tracking-normal text-muted-foreground/60">
                        {shortcuts.length}
                      </span>
                    </h3>
                    <ul className="space-y-1.5">
                      {shortcuts.map((shortcut) => (
                        <ShortcutRow key={shortcut.id} shortcut={shortcut} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-5 py-3">
            <Button onPress={() => onOpenChange(false)}>Got it</Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function ShortcutRow({ shortcut }: { shortcut: PhotoshopShortcut }) {
  const Icon = shortcut.icon;
  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm group-hover:border-primary/20 group-hover:text-primary">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-none font-medium text-foreground">
          {shortcut.label}
        </span>
        <span className="block truncate text-[11px] leading-none text-muted-foreground">
          {shortcut.description}
        </span>
      </span>
      <HotkeyKbd hotkey={shortcut.hotkey} className="shrink-0" />
    </li>
  );
}
