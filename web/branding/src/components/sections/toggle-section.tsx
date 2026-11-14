import { Toggle } from "@jfa.dev/common/ui";
import { Bold, Italic } from "lucide-react";
import { useState } from "react";

import { Row, Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function ToggleSection() {
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(true);
  return (
    <Section
      id="toggle"
      title="Toggle"
      description="Independent pressed states, not navigation. Enter or Space toggles the focused control. Auto density expands touch targets on mobile."
    >
      <Specimen label="Off, on and disabled">
        <Row>
          <Toggle aria-label="Bold sample" isSelected={bold} onChange={setBold}>
            <Bold />
            Bold
          </Toggle>
          <Toggle
            aria-label="Italic sample"
            variant="default"
            isSelected={italic}
            onChange={setItalic}
          >
            <Italic />
            Italic
          </Toggle>
          <Toggle isDisabled>Disabled</Toggle>
          <Toggle isDisabled isSelected>
            Disabled on
          </Toggle>
        </Row>
        <p className={`type-body ${bold ? "font-bold" : ""} ${italic ? "italic" : ""}`}>
          A useful toolbox, with a consistent voice.
        </p>
      </Specimen>
      <Specimen label="Comfortable and compact density">
        <Row>
          <Toggle density="comfortable">Comfortable</Toggle>
          <Toggle density="compact">Compact editor</Toggle>
        </Row>
      </Specimen>
    </Section>
  );
}
