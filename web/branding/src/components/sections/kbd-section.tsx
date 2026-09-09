import { Kbd, KbdGroup } from "@jfa.dev/common/ui";

import { Row, Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function KbdSection() {
  return (
    <Section
      description="Kbd and KbdGroup from react-aria-components. Muted by default. Adapts inside tooltips via data-slot."
      id="kbd"
      title="Kbd"
    >
      <Specimen label="Keys">
        <Row>
          <Kbd>⌘</Kbd>
          <Kbd>⇧</Kbd>
          <Kbd>⌥</Kbd>
          <Kbd>↵</Kbd>
          <Kbd>Esc</Kbd>
          <Kbd>U</Kbd>
        </Row>
      </Specimen>
      <Specimen label="Groups">
        <div className="flex flex-wrap gap-6">
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>⇧</Kbd>
            <Kbd>U</Kbd>
          </KbdGroup>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>Shift</Kbd>
            <Kbd>U</Kbd>
          </KbdGroup>
        </div>
      </Specimen>
      <Specimen label="In a sentence">
        <Row>
          <span className="text-sm text-muted-foreground">Press</span>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>⇧</Kbd>
            <Kbd>U</Kbd>
          </KbdGroup>
          <span className="text-sm text-muted-foreground">to switch apps.</span>
        </Row>
      </Specimen>
    </Section>
  );
}
