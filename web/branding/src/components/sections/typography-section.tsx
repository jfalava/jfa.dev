import { Kbd, KbdGroup } from "@jfa.dev/common/ui";

import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function TypographySection() {
  return (
    <Section
      description="IBM Plex Sans for UI. Zilla Slab for user-editable titles. Google Sans Code for shortcuts and tokens. Loaded from @fontsource in common."
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
      <Specimen label="Scale">
        <div className="max-w-3xl space-y-3">
          <p className="font-sans text-3xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-4xl">
            Branding
          </p>
          <p className="font-serif text-3xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-4xl">
            Weekend groceries
          </p>
          <p className="text-base">Body in IBM Plex Sans. Inputs inherit Zilla Slab.</p>
          <p className="text-sm text-muted-foreground">Muted copy stays on the same measure.</p>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>⇧</Kbd>
            <Kbd>U</Kbd>
          </KbdGroup>
        </div>
      </Specimen>
    </Section>
  );
}
