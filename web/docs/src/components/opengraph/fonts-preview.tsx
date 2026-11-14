import { PreviewShell } from "./preview-shell";

export function FontsPreview() {
  return (
    <>
      <PreviewShell
        label="Families"
        caption="These are the built-in canvas text families. The editor controls and Docs use IBM Plex Sans."
      >
        <div className="grid w-full gap-6 p-6 text-left sm:grid-cols-3">
          <div className="space-y-1">
            <p
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "Pretendard, sans-serif" }}
            >
              Pretendard
            </p>
            <p className="text-sm text-muted-foreground">Default for new canvas text layers.</p>
          </div>
          <div className="space-y-1">
            <p className="font-serif text-lg font-semibold tracking-tighter uppercase">
              Zilla Slab
            </p>
            <p className="text-sm text-muted-foreground">Display and emphasis.</p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-lg font-semibold">Google Sans Code</p>
            <p className="text-sm text-muted-foreground">Code and labels in artwork.</p>
          </div>
        </div>
      </PreviewShell>

      <PreviewShell
        label="Canvas examples"
        caption="Illustrative artwork sizes, not the editor UI type scale. Text layers have their own size and weight controls."
      >
        <div className="w-full space-y-2 p-6 text-left">
          <p
            className="text-3xl leading-[0.95] font-semibold tracking-tighter uppercase"
            style={{ fontFamily: "Pretendard, sans-serif" }}
          >
            OpenGraph
          </p>
          {/* ui-lint-allow reference-drift: font specimen scaled to the card, not a page title */}
          <p className="font-serif text-3xl leading-[0.95] font-semibold tracking-tighter uppercase">
            Weekend groceries
          </p>
          <p className="text-base" style={{ fontFamily: "Pretendard, sans-serif" }}>
            Canvas copy in Pretendard.
          </p>
          <p className="text-sm text-muted-foreground">Muted copy stays on the same measure.</p>
        </div>
      </PreviewShell>
    </>
  );
}
