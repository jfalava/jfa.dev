import { Hand, Image as ImageIcon, MousePointer2, Palette, Pipette, Square, Type } from "lucide-react";

import { PreviewShell } from "./preview-shell";

function Swatch({ color, pos }: { color: string; pos: "bg" | "fg" }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute size-5 rounded-sm border shadow-sm ${pos === "bg" ? "top-1 left-1 border-white/30" : "right-1 bottom-1 border-white"}`}
      style={{ backgroundColor: color }}
    />
  );
}

export function ToolsPreview() {
  return (
    <PreviewShell label="Toolbox — Photoshop map" caption="V Move, H Hand (hold Space), T Text, U Shape, P Image, I Eyedropper, G Fill. All are single keys — no Mod needed.">
      <div className="flex justify-center bg-muted/20 p-6">
        <div className="flex w-[56px] flex-col items-center gap-1 border-r border-zinc-800 bg-[#2b2b2b] py-3 dark:bg-[#1e1e1e]">
          <span className="flex size-8 items-center justify-center rounded-[4px] border border-white/20 bg-white/15 text-white">
            <MousePointer2 className="size-[18px]" />
          </span>
          <span className="flex size-8 items-center justify-center rounded-[4px] border border-transparent text-zinc-400">
            <Hand className="size-[18px]" />
          </span>
          <div className="my-1 h-px w-8 bg-white/10" />
          <span className="flex size-8 items-center justify-center rounded-[4px] border border-transparent text-zinc-400">
            <Type className="size-[18px]" />
          </span>
          <span className="flex size-8 items-center justify-center rounded-[4px] border border-transparent text-zinc-400">
            <Square className="size-[18px]" />
          </span>
          <span className="flex size-8 items-center justify-center rounded-[4px] border border-transparent text-zinc-400">
            <ImageIcon className="size-[18px]" />
          </span>
          <div className="my-1 h-px w-8 bg-white/10" />
          <span className="flex size-8 items-center justify-center rounded-[4px] border border-transparent text-zinc-400">
            <Pipette className="size-[18px]" />
          </span>
          <span className="flex size-8 items-center justify-center rounded-[4px] border border-transparent text-zinc-400">
            <Palette className="size-[18px]" />
          </span>
          <div className="relative my-1 flex size-9 items-center justify-center">
            <Swatch color="#f5f1ea" pos="bg" />
            <Swatch color="#d6ff48" pos="fg" />
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 size-2 rounded-full border border-white/20 bg-zinc-700" />
          </div>
          <span className="px-1 text-center text-[7px] leading-none tracking-wide text-zinc-400">FG/BG</span>
        </div>
      </div>
    </PreviewShell>
  );
}

export function ShortcutsPreview() {
  return (
    <PreviewShell label="Shortcuts — hold ? to peek" caption="Every tool and action has a Photoshop-style shortcut. The guide is the same component you open with ? in the editor.">
      <div className="p-4">
        <div className="rounded-lg border bg-popover p-4 text-popover-foreground">
          <div className="flex items-baseline gap-2 border-b pb-2">
            <span className="font-mono text-[11px] tracking-[0.14em] text-primary uppercase">Shortcuts</span>
            <span className="text-[11px] text-muted-foreground/75">/</span>
            <span className="text-[11px] text-muted-foreground/75">Photoshop map</span>
            <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
              Hold <span className="rounded bg-muted px-1 font-mono text-xs">?</span> to preview
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="border-b pb-1 font-mono text-[11px] uppercase">Tools</p>
              <p className="text-xs">
                <span className="rounded bg-muted px-1 font-mono">V</span> Move · <span className="rounded bg-muted px-1 font-mono">H</span> Hand ·{" "}
                <span className="rounded bg-muted px-1 font-mono">T</span> Text
              </p>
            </div>
            <div className="space-y-1">
              <p className="border-b pb-1 font-mono text-[11px] uppercase">File</p>
              <p className="text-xs">
                <span className="rounded bg-muted px-1 font-mono">Alt+S</span> Export ZIP ·{" "}
                <span className="rounded bg-muted px-1 font-mono">Alt+N</span> New
              </p>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
