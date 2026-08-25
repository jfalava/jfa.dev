import { PreviewShell } from "./preview-shell";

/**
 * Branding families + scale showcase — same markup as
 * web/branding/src/components/sections/typography-section.tsx but wrapped
 * in docs PreviewShell so it fits the opengraph manual.
 *
 * All three families are bundled via @fontsource in common/src/styles.css
 * (Pretendard, Zilla Slab, Google Sans Code) and wired to --font-sans /
 * --font-serif / --font-mono — no extra setup in docs.
 */
export function FontsPreview() {
  return (
    <>
      <PreviewShell
        label="Families"
        caption="Pretendard (sans), Zilla Slab (serif), Google Sans Code (mono) — all from @fontsource via common."
      >
        <div className="grid w-full gap-6 p-6 text-left sm:grid-cols-3">
          <div className="space-y-1">
            <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
              sans — Pretendard
            </p>
            <p className="font-sans text-lg font-semibold">The quick fox — 500</p>
            <p className="font-sans text-sm text-muted-foreground">Used for UI, body, and headings.</p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
              serif — Zilla Slab
            </p>
            <p className="font-serif text-lg font-semibold">The quick fox — 500</p>
            <p className="font-serif text-sm text-muted-foreground">Used for display and emphasis.</p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
              mono — Google Sans Code
            </p>
            <p className="font-mono text-lg font-semibold">The quick fox — 500</p>
            <p className="font-mono text-sm text-muted-foreground">Used for code and kbd.</p>
          </div>
        </div>
      </PreviewShell>

      <PreviewShell
        label="Scale"
        caption="Type scale used across the editor and docs — headings, body, and label."
      >
        <div className="w-full space-y-2 p-6 text-left">
          <p className="text-3xl font-bold tracking-tight">Heading 3xl — bold</p>
          <p className="text-xl font-semibold">Heading xl — semibold</p>
          <p className="text-base">Body base — regular</p>
          <p className="text-sm text-muted-foreground">Body sm — muted</p>
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            Label xs — mono uppercase
          </p>
        </div>
      </PreviewShell>
    </>
  );
}
