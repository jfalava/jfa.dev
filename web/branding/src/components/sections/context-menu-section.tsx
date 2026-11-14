import {
  buttonVariants,
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@jfa.dev/common/ui";
import { useState } from "react";
import { Pressable } from "react-aria-components";

import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function ContextMenuSection() {
  const [action, setAction] = useState("No action yet");
  return (
    <Section
      id="context-menu"
      title="Context menu"
      description="Right-click or long-press the target. With keyboard focus, use Shift+F10 (Control+Enter on macOS); arrows navigate, Enter activates and Escape dismisses."
    >
      <Specimen label="Actions, submenu and disabled item">
        <ContextMenuTrigger>
          <Pressable>
            <button
              type="button"
              className={buttonVariants({
                variant: "outline",
                className: "h-24 w-full max-w-xl border-dashed",
              })}
            >
              Artwork actions
            </button>
          </Pressable>
          <ContextMenu aria-label="Artwork actions">
            <ContextMenuItem onAction={() => setAction("Duplicated artwork")}>
              Duplicate
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>Export</ContextMenuSubTrigger>
              <ContextMenuSubContent aria-label="Export format">
                <ContextMenuItem onAction={() => setAction("Selected PNG export")}>
                  PNG
                </ContextMenuItem>
                <ContextMenuItem onAction={() => setAction("Selected SVG export")}>
                  SVG
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem isDisabled>Paste (unavailable)</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onAction={() => setAction("Removed sample artwork")}
            >
              Remove sample
            </ContextMenuItem>
          </ContextMenu>
        </ContextMenuTrigger>
        <output className="block type-meta">{action}</output>
      </Specimen>
    </Section>
  );
}
