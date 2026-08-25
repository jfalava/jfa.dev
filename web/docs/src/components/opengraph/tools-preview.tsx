import { ColorPicker, Kbd, KbdGroup } from "@jfa.dev/common/ui";
import {
  Hand,
  Image as ImageIcon,
  MousePointer2,
  Palette,
  Pipette,
  Square,
  Type,
} from "lucide-react";
import { useState } from "react";

import { PreviewShell } from "./preview-shell";

export function ToolsPreview() {
  // stub-local — mirrors web/opengraph/src/routes/index.tsx:PhotoshopToolbox active state, no wiring
  const [active, setActive] = useState<
    "move" | "hand" | "text" | "shape" | "image" | "pipette" | "fill"
  >("move");
  const [fgColor, setFgColor] = useState("#d6ff48");
  const [bgColor, setBgColor] = useState("#f5f1ea");

  const btnBase =
    "flex size-8 items-center justify-center rounded-[4px] border text-zinc-400 transition-colors focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:outline-none";
  const activeCls = "border-white/20 bg-white/15 text-white shadow-inner";
  const idleCls =
    "border-transparent bg-transparent hover:border-white/10 hover:bg-white/10 hover:text-white";

  return (
    <PreviewShell
      label="Toolbox — Photoshop map"
      caption="V Move, H Hand (hold Space), T Text, U Shape, P Image, I Eyedropper, G Fill. All are single keys — no Mod needed."
    >
      <div className="flex justify-center bg-muted/20 p-6">
        <div className="flex w-[56px] flex-col items-center gap-1 border-r border-zinc-800 bg-[#2b2b2b] py-3 dark:bg-[#1e1e1e]">
          <button
            aria-label="Move tool (V)"
            aria-pressed={active === "move"}
            onClick={() => setActive("move")}
            type="button"
            className={`${btnBase} ${active === "move" ? activeCls : idleCls}`}
          >
            <MousePointer2 className="size-[18px]" />
          </button>
          <button
            aria-label="Hand tool (H)"
            aria-pressed={active === "hand"}
            onClick={() => setActive("hand")}
            type="button"
            className={`${btnBase} ${active === "hand" ? activeCls : idleCls}`}
          >
            <Hand className="size-[18px]" />
          </button>
          <div className="my-1 h-px w-8 bg-white/10" />
          <button
            aria-label="Add text (T)"
            aria-pressed={active === "text"}
            onClick={() => setActive("text")}
            type="button"
            className={`${btnBase} ${active === "text" ? activeCls : idleCls}`}
          >
            <Type className="size-[18px]" />
          </button>
          <button
            aria-label="Add shape (U)"
            aria-pressed={active === "shape"}
            onClick={() => setActive("shape")}
            type="button"
            className={`${btnBase} ${active === "shape" ? activeCls : idleCls}`}
          >
            <Square className="size-[18px]" />
          </button>
          <button
            aria-label="Add image (P)"
            aria-pressed={active === "image"}
            onClick={() => setActive("image")}
            type="button"
            className={`${btnBase} ${active === "image" ? activeCls : idleCls}`}
          >
            <ImageIcon className="size-[18px]" />
          </button>
          <div className="my-1 h-px w-8 bg-white/10" />
          <button
            aria-label="Eyedropper tool (I)"
            aria-pressed={active === "pipette"}
            onClick={() => setActive("pipette")}
            type="button"
            className={`${btnBase} ${active === "pipette" ? activeCls : idleCls}`}
          >
            <Pipette className="size-[18px]" />
          </button>
          <button
            aria-label="Fill / swatches (G)"
            aria-pressed={active === "fill"}
            onClick={() => setActive("fill")}
            type="button"
            className={`${btnBase} ${active === "fill" ? activeCls : idleCls}`}
          >
            <Palette className="size-[18px]" />
          </button>
          <div className="relative my-1 flex size-9 items-center justify-center">
            <ColorPicker
              compact
              color={bgColor}
              onChange={setBgColor}
              ariaLabel="Background color"
              className="absolute top-1 left-1 !size-5 !rounded-sm !border-white/30 !p-0 shadow-sm"
            />
            <ColorPicker
              compact
              color={fgColor}
              onChange={setFgColor}
              ariaLabel="Foreground color"
              className="absolute right-1 bottom-1 !size-5 !rounded-sm !border-white !p-0 shadow-sm"
            />
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 size-2 rounded-full border border-white/20 bg-zinc-700" />
          </div>
          <span className="px-1 text-center text-[7px] leading-none tracking-wide text-zinc-400">
            FG/BG
          </span>
        </div>
      </div>
    </PreviewShell>
  );
}

export function ShortcutsPreview() {
  return (
    <PreviewShell
      label="Shortcuts — hold ? to peek"
      caption="Every tool and action has a Photoshop-style shortcut. The guide is the same component you open with ? in the editor."
    >
      <div className="p-4">
        <div className="rounded-lg border bg-popover p-4 text-popover-foreground">
          <div className="flex items-baseline gap-2 border-b pb-2">
            <span className="font-mono text-[11px] tracking-[0.14em] text-primary uppercase">
              Shortcuts
            </span>
            <span className="text-[11px] text-muted-foreground/75">/</span>
            <span className="text-[11px] text-muted-foreground/75">Photoshop map</span>
            <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
              Hold <Kbd>?</Kbd> to preview
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="border-b pb-1 font-mono text-[11px] uppercase">Tools</p>
              <p className="text-xs">
                <Kbd>V</Kbd> Move · <Kbd>H</Kbd> Hand · <Kbd>T</Kbd> Text
              </p>
            </div>
            <div className="space-y-1">
              <p className="border-b pb-1 font-mono text-[11px] uppercase">File</p>
              <p className="text-xs">
                <KbdGroup>
                  <Kbd>Alt</Kbd>
                  <Kbd>S</Kbd>
                </KbdGroup>{" "}
                Export ZIP ·{" "}
                <KbdGroup>
                  <Kbd>Alt</Kbd>
                  <Kbd>N</Kbd>
                </KbdGroup>{" "}
                New
              </p>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
