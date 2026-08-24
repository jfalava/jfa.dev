import { PreviewShell } from "./preview-shell";

export function TextPreview() {
  return (
    <PreviewShell
      label="Typography — live controls"
      caption="Size and Weight share a line. Alignment shows Left, Center, and Right — the active choice is highlighted."
    >
      <div className="space-y-3 p-4">
        <div>
          <p className="block text-[10px] text-muted-foreground">Text</p>
          <div className="mt-1 min-h-20 w-full rounded-md border bg-input/20 p-2 text-xs">
            Make it unmistakable.
          </div>
        </div>
        <div className="block text-[10px] text-muted-foreground">
          <span className="block">Font family</span>
          <span className="mt-1 flex h-7 items-center rounded-md border bg-input/20 px-2 text-xs">
            Pretendard
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1 text-[10px] leading-none">
            <span className="font-medium text-muted-foreground">Size</span>
            <span className="flex h-7 items-center gap-1 rounded-md border bg-input/20 px-2">
              <span className="w-full text-right text-xs">56 px</span>
            </span>
          </div>
          <div className="flex flex-col gap-1 text-[10px] leading-none">
            <span className="font-medium text-muted-foreground">Weight</span>
            <span className="flex h-7 items-center gap-1 rounded-md border bg-input/20 px-2 text-xs">
              Semibold
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <span className="inline-flex h-6 items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 text-xs font-medium text-primary">
            ≡ Left
          </span>
          <span className="inline-flex h-6 items-center justify-center gap-1.5 rounded-md border border-input bg-input/20 text-xs">
            ≡ Center
          </span>
          <span className="inline-flex h-6 items-center justify-center gap-1.5 rounded-md border border-input bg-input/20 text-xs">
            ≡ Right
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-input/20 px-2 py-1.5 text-[10px]">
          <span className="font-medium text-muted-foreground">Color</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="size-5 rounded border bg-[#2f302c]" />
            <span className="font-mono text-xs">#2F302C</span>
          </span>
        </div>
      </div>
    </PreviewShell>
  );
}

export function PositionPreview() {
  return (
    <PreviewShell
      label="Position & size — labels on top"
      caption="Each field shows its label above the value, so large numbers stay readable."
    >
      <div className="grid grid-cols-2 gap-2 p-4">
        <div className="flex flex-col gap-1 text-[10px] leading-none">
          <span className="font-medium text-muted-foreground">X</span>
          <span className="flex h-7 items-center justify-end rounded-md border bg-input/20 px-2 text-xs">
            759
          </span>
        </div>
        <div className="flex flex-col gap-1 text-[10px] leading-none">
          <span className="font-medium text-muted-foreground">Y</span>
          <span className="flex h-7 items-center justify-end rounded-md border bg-input/20 px-2 text-xs">
            70
          </span>
        </div>
        <div className="flex flex-col gap-1 text-[10px] leading-none">
          <span className="font-medium text-muted-foreground">W</span>
          <span className="flex h-7 items-center justify-end rounded-md border bg-input/20 px-2 text-xs">
            282.75
          </span>
        </div>
        <div className="flex flex-col gap-1 text-[10px] leading-none">
          <span className="font-medium text-muted-foreground">H</span>
          <span className="flex h-7 items-center justify-end rounded-md border bg-input/20 px-2 text-xs">
            282.75
          </span>
        </div>
      </div>
    </PreviewShell>
  );
}
