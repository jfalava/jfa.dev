import { PreviewShell } from "./preview-shell";

export function FontsPreview() {
  return (
    <>
      <PreviewShell
        label="Families"
        caption="Pretendard for UI. Zilla Slab for display. Google Sans Code for shortcuts and tokens. Loaded from @fontsource in common."
      >
        <div className="grid w-full gap-6 p-6 text-left sm:grid-cols-3">
          <div className="space-y-1">
            <p className="font-sans text-lg font-semibold tracking-tight">Pretendard</p>
            <p className="text-sm text-muted-foreground">UI, body, and headings.</p>
          </div>
          <div className="space-y-1">
            <p className="font-serif text-lg font-semibold tracking-tighter uppercase">
              Zilla Slab
            </p>
            <p className="text-sm text-muted-foreground">Display and emphasis.</p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-lg font-semibold">Google Sans Code</p>
            <p className="text-sm text-muted-foreground">Kbd, class names, token names.</p>
          </div>
        </div>
      </PreviewShell>

      <PreviewShell label="Scale" caption="Type scale used in the editor.">
        <div className="w-full space-y-2 p-6 text-left">
          <p className="font-sans text-3xl leading-[0.95] font-semibold tracking-tighter uppercase">
            OpenGraph
          </p>
          <p className="font-serif text-3xl leading-[0.95] font-semibold tracking-tighter uppercase">
            Weekend groceries
          </p>
          <p className="text-base">Body in Pretendard.</p>
          <p className="text-sm text-muted-foreground">Muted copy stays on the same measure.</p>
        </div>
      </PreviewShell>
    </>
  );
}
