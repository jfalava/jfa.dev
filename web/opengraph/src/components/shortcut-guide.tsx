import { Button } from "@jfa.dev/common/ui";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

import { DocsLink } from "@/components/docs-link";
import { HotkeyKbd } from "@/components/hotkey-kbd";
import { CATEGORY_ORDER, SHORTCUT_BY_CATEGORY, type PhotoshopShortcut } from "@/editor/keymap";
import { opengraphDocs } from "@/lib/docs-paths";

interface ShortcutGuideProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ShortcutGuide({ isOpen, onOpenChange }: ShortcutGuideProps) {
  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      isDismissable
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal className="w-full max-w-3xl outline-none">
        <Dialog
          aria-label="Keyboard shortcuts"
          className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
        >
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Keyboard shortcuts</h2>
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                Hold <HotkeyKbd hotkey="?" /> to preview
                <span className="mx-1 text-muted-foreground/50">·</span>
                <HotkeyKbd hotkey="Escape" /> to close
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Single keys switch tools. Alt is for file and edit so it does not fight the browser.
              Mod is only undo, redo, duplicate, and zoom. Keys do nothing while an input is
              focused.
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
                    <h3 className="flex items-center gap-2 border-b border-border pb-2 text-xs font-medium">
                      {category}
                      <span className="ml-auto text-[10px] font-normal text-muted-foreground">
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

          <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/20 px-5 py-3">
            <DocsLink href={opengraphDocs.shortcuts}>Full shortcuts manual</DocsLink>
            <Button onPress={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
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
