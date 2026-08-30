import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function TypographySection() {
  return (
    <Section
      description="IBM Plex Sans (sans), Zilla Slab (serif), Google Sans Code (mono) — all from @fontsource via common."
      id="typography"
      title="Typography"
    >
      <Card>
        <Preview label="families">
          <div className="grid w-full gap-6 text-left sm:grid-cols-3">
            <div className="space-y-1">
              <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                sans — IBM Plex Sans
              </p>
              <p className="font-sans text-lg font-semibold">The quick fox — 500</p>
              <p className="font-sans text-sm text-muted-foreground">
                Used for UI, body, and headings.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                serif — Zilla Slab
              </p>
              <p className="font-serif text-lg font-semibold">The quick fox — 500</p>
              <p className="font-serif text-sm text-muted-foreground">
                Used for user-editable text.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                mono — Google Sans Code
              </p>
              <p className="font-mono text-lg font-semibold">The quick fox — 500</p>
              <p className="font-mono text-sm text-muted-foreground">Used for code and kbd.</p>
            </div>
          </div>
        </Preview>
        <Preview label="scale">
          <div className="w-full space-y-2 text-left">
            <p className="text-3xl font-bold tracking-tight">Heading 3xl — bold</p>
            <p className="text-xl font-semibold">Heading xl — semibold</p>
            <p className="text-base">Body base — regular</p>
            <p className="text-sm text-muted-foreground">Body sm — muted</p>
            <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
              Label xs — mono uppercase
            </p>
          </div>
        </Preview>
      </Card>
    </Section>
  );
}
