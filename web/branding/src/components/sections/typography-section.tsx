import { Kbd, KbdGroup } from "@jfa.dev/common/ui";

import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function TypographySection() {
  return (
    <Section
      description="IBM Plex Sans for UI. Zilla Slab for user-editable titles. Google Sans Code for shortcuts and tokens. Served once for every app from /shared/fonts/."
      id="typography"
      title="Typography"
    >
      <Specimen label="Families">
        <div className="grid max-w-3xl gap-6 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="font-sans text-lg font-semibold tracking-tight">IBM Plex Sans</p>
            <p className="text-sm text-muted-foreground">UI, body, and page titles.</p>
          </div>
          <div className="space-y-1">
            <p className="font-serif text-lg font-semibold tracking-tighter uppercase">
              Zilla Slab
            </p>
            <p className="text-sm text-muted-foreground">List titles the user can edit.</p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-lg font-semibold">Google Sans Code</p>
            <p className="text-sm text-muted-foreground">Kbd, class names, token names.</p>
          </div>
        </div>
      </Specimen>
      <Specimen label="Roles">
        <div className="reading-measure space-y-4">
          <p className="type-page-title">Page title</p>
          <p className="type-meta">type-page-title · 36px → 60px at sm</p>
          <p className="type-section-title">Section title</p>
          <p className="type-meta">type-section-title · 24px → 30px at sm</p>
          <p className="type-body">
            Reading text uses type-body: 16px with a 1.625 line height and a reading-measure limit
            of 65ch.
          </p>
          <p className="type-ui">Standard UI labels use type-ui: 14px.</p>
          <p className="type-compact">Dense desktop controls use type-compact: 12px.</p>
          <p className="type-meta">Supporting metadata uses type-meta: 12px in muted-foreground.</p>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>⇧</Kbd>
            <Kbd>U</Kbd>
          </KbdGroup>
          <p className="type-ui text-muted-foreground">
            Sub-12px type is reserved for keyboard notation and miniature illustrations, not
            ordinary interactive labels. OpenGraph artwork and Fumadocs reading layouts keep their
            own scales.
          </p>
        </div>
      </Specimen>
    </Section>
  );
}
