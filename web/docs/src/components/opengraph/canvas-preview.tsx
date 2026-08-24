import { Frame } from "lucide-react";

import { PreviewShell } from "./preview-shell";

const presets = [
  { id: "og", label: "OG Banner", sub: "1200×630", hint: "Facebook / LinkedIn" },
  { id: "x", label: "X Card", sub: "1200×675", hint: "X / Twitter" },
  { id: "yt", label: "YouTube", sub: "1280×720", hint: "16:9 thumbnail" },
  { id: "sq", label: "Square", sub: "1080×1080", hint: "Instagram" },
  { id: "story", label: "Story", sub: "1080×1920", hint: "9:16 stories" },
  { id: "wide", label: "Wide", sub: "1600×900", hint: "16:9 banner" },
];

export function CanvasPreview() {
  return (
    <PreviewShell label="Canvas — presets" caption="Pick a preset or type a custom size (100–8000 px). The background fills the new size automatically. This is the same control you see in the editor’s Properties → Canvas.">
      <div className="p-4">
        <details open className="group/canvas border-b border-border py-4 first:pt-0 last:border-b-0">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-medium marker:hidden select-none [&::-webkit-details-marker]:hidden">
            <Frame className="size-3.5 text-primary" />
            Canvas
            <span className="ml-auto flex items-center gap-2 text-[10px] font-normal text-muted-foreground">
              1200×630
              <span className="text-[11px]">▾</span>
            </span>
          </summary>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-md border px-2 py-2 text-left ${p.id === "og" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/20"}`}
                >
                  <span className="block text-xs font-medium leading-none">{p.label}</span>
                  <span className="block text-[10px] leading-none text-muted-foreground">{p.sub}</span>
                  <span className="block truncate text-[9px] leading-none text-muted-foreground/70">{p.hint}</span>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-2">
              <p className="mb-2 text-[10px] font-medium text-muted-foreground">
                Custom <span className="text-primary">• active</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 text-[10px] leading-none">
                  <span className="font-medium text-muted-foreground">W</span>
                  <span className="flex h-7 items-center gap-1 rounded-md border border-input bg-input/20 px-2">
                    <span className="w-full text-right text-xs">1200</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-[10px] leading-none">
                  <span className="font-medium text-muted-foreground">H</span>
                  <span className="flex h-7 items-center gap-1 rounded-md border border-input bg-input/20 px-2">
                    <span className="w-full text-right text-xs">630</span>
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">Any size from 100 to 8000 px. Background fills automatically.</p>
            </div>
          </div>
        </details>
      </div>
    </PreviewShell>
  );
}

export function TabsPreview() {
  return (
    <PreviewShell label="Tabs" caption="Each tab is a separate canvas with its own layers, size, and history. Tabs live above the canvas.">
      <div className="p-0">
        <div className="flex h-8 items-center gap-2 border-b bg-background px-2 text-[11px]">
          <span className="size-3 shrink-0 rounded-full bg-primary/15" />
          <div className="flex gap-1">
            <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">Untitled canvas</span>
            <span className="rounded-md border border-transparent bg-muted/40 px-2 py-1 text-muted-foreground">Untitled canvas 2</span>
            <span className="flex size-6 items-center justify-center rounded-md border bg-background text-muted-foreground">+</span>
          </div>
          <span className="ml-auto hidden text-[10px] text-muted-foreground sm:block">Saved locally in this browser</span>
        </div>
        <div className="grid h-24 grid-cols-[56px_1fr_280px] gap-px bg-border text-[10px] text-muted-foreground">
          <div className="bg-[#2b2b2b] p-2 text-center">Tools</div>
          <div className="bg-muted/20 p-6 text-center">Canvas 1200×630</div>
          <div className="bg-background p-2">Properties · Layers</div>
        </div>
      </div>
    </PreviewShell>
  );
}
