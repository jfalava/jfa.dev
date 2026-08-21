import { Kbd, KbdGroup } from "@jfa.dev/common/ui";

import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function KbdSection() {
  return (
    <Section
      description="KBD + KBDGroup from react-aria-components. Inherits muted styling; adapts inside tooltips via data-slot."
      id="kbd"
      title="KBD"
    >
      <Card>
        <Preview label="single">
          <div className="flex flex-wrap gap-2">
            <Kbd>⌘</Kbd>
            <Kbd>⇧</Kbd>
            <Kbd>⌥</Kbd>
            <Kbd>↵</Kbd>
            <Kbd>Esc</Kbd>
            <Kbd>A</Kbd>
          </div>
        </Preview>
        <Preview label="groups">
          <div className="flex flex-wrap gap-6">
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>Shift</Kbd>
              <Kbd>P</Kbd>
            </KbdGroup>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>⇧</Kbd>
              <Kbd>N</Kbd>
            </KbdGroup>
          </div>
        </Preview>
        <Preview label="in context">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Press</span>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>J</Kbd>
            </KbdGroup>
            <span className="text-muted-foreground">to open the palette</span>
          </div>
        </Preview>
      </Card>
    </Section>
  );
}
