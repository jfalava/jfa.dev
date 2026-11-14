import { Button, ColorField, ColorPicker } from "@jfa.dev/common/ui";
import { useState } from "react";

import { Row, Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function ColorPickerSection() {
  const [color, setColor] = useState("#c56a3a");
  const [removed, setRemoved] = useState(false);
  return (
    <Section
      id="color-picker"
      title="Color picker"
      description="Artwork colors, not theme tokens. Edit the hex value or focus a color slider and use the arrow keys. Escape closes the picker."
    >
      <Specimen label="Compact field and disabled field">
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <ColorField label="Artwork accent" value={color} onChange={setColor} />
          <ColorField label="Locked accent" value="#64748b" onChange={setColor} disabled />
        </div>
      </Specimen>
      <Specimen label="Removable swatch">
        <Row>
          {removed ? (
            <Button variant="outline" onPress={() => setRemoved(false)}>
              Restore swatch
            </Button>
          ) : (
            <div className="w-40">
              <ColorPicker
                ariaLabel="Swatch color"
                color={color}
                onChange={setColor}
                onRemove={() => setRemoved(true)}
              />
            </div>
          )}
          <output aria-label="Selected color" className="font-mono type-compact">
            {color.toUpperCase()}
          </output>
        </Row>
      </Specimen>
    </Section>
  );
}
