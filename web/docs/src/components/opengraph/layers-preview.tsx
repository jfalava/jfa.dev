import { Eye, EyeOff, LockKeyhole, Square, Type, Unlock } from "lucide-react";

import { PreviewShell } from "./preview-shell";

const mockLayers = [
  { id: "1", name: "New text", type: "text" as const, visible: true, locked: false },
  { id: "2", name: "Supporting copy", type: "text" as const, visible: true, locked: false },
  { id: "3", name: "Headline", type: "text" as const, visible: true, locked: false },
  { id: "4", name: "Accent block", type: "shape" as const, visible: true, locked: false },
  { id: "5", name: "Background", type: "shape" as const, visible: true, locked: true },
];

export function LayersPreview() {
  return (
    <PreviewShell
      label="Layers — live panel"
      caption="Search, reorder by dragging, toggle visibility/lock, double-click to rename. The + and ⋯ menus are the same dropdowns as in the editor."
    >
      <div className="mx-auto max-w-sm border bg-background">
        <div className="flex h-10 items-center justify-between border-b px-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="size-3.5 text-primary">▦</span> Layers
          </div>
          <div className="flex gap-0.5">
            <span className="flex size-6 items-center justify-center rounded-md text-muted-foreground">
              +
            </span>
            <span className="flex size-6 items-center justify-center rounded-md text-muted-foreground">
              ⋯
            </span>
          </div>
        </div>
        <div className="border-b p-3">
          <div className="rounded-md border bg-input/20 px-2 py-1.5 text-xs text-muted-foreground">
            Search layers
          </div>
        </div>
        <div className="p-2">
          {mockLayers.map((l) => {
            const Icon = l.type === "text" ? Type : Square;
            const isHeadline = l.name === "Headline";
            return (
              <div
                key={l.id}
                className={`flex items-center gap-1 rounded-md px-1 py-1 text-xs ${isHeadline ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
              >
                <span className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5">
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{l.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {l.type === "text" ? "Text" : "Shape"}
                  </span>
                </span>
                <span className="flex size-6 items-center justify-center rounded-md text-muted-foreground">
                  {l.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </span>
                <span className="flex size-6 items-center justify-center rounded-md text-muted-foreground">
                  {l.locked ? (
                    <LockKeyhole className="size-3.5" />
                  ) : (
                    <Unlock className="size-3.5" />
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2 text-[10px] text-muted-foreground">
          <span>5 layers</span>
          <span>1200 × 630</span>
        </div>
      </div>
    </PreviewShell>
  );
}

export function ColorPickerPreview() {
  return (
    <PreviewShell
      label="Color picker"
      caption="Click any swatch to open the picker. The same picker appears in the toolbox and in Properties. Drag the field or type a hex."
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1 text-[10px]">
          <span className="font-medium text-muted-foreground">Color</span>
          <div className="flex items-center gap-2 rounded-md border bg-input/20 px-2 py-1.5">
            <span className="size-7 rounded-md border bg-[#E91AE7]" />
            <span className="flex-1 text-right font-mono text-xs">#E91AE7</span>
          </div>
        </div>
        <div className="mx-auto w-56 rounded-xl border bg-popover p-3 shadow-lg">
          <div
            className="h-36 rounded-md"
            style={{
              background:
                "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
            }}
          />
          <div className="mt-3 flex gap-2">
            <div className="h-8 w-24 rounded-md border bg-white font-mono text-xs leading-8">
              #E91AE7
            </div>
            <div className="flex size-8 items-center justify-center rounded-md border">🎨</div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
