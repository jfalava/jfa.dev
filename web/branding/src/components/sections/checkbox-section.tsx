import { Checkbox } from "@jfa.dev/common/ui";

import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function CheckboxSection() {
  return (
    <Section
      description="Aria Checkbox. Supports selected, indeterminate, and disabled. Used for shopping list items."
      id="checkbox"
      title="Checkbox"
    >
      <Specimen label="States">
        <div className="flex flex-wrap gap-6">
          <Checkbox>Sourdough</Checkbox>
          <Checkbox defaultSelected>Oat milk</Checkbox>
          <Checkbox isIndeterminate>Produce</Checkbox>
          <Checkbox isDisabled>Out of season</Checkbox>
          <Checkbox defaultSelected isDisabled>
            Already bought
          </Checkbox>
        </div>
      </Specimen>
      <Specimen label="With notes">
        <div className="grid w-full max-w-sm gap-4">
          <Checkbox defaultSelected>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm leading-none font-medium">Oat milk</span>
              <span className="text-xs text-muted-foreground">2 litres, barista.</span>
            </span>
          </Checkbox>
          <Checkbox>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm leading-none font-medium">Blood oranges</span>
              <span className="text-xs text-muted-foreground">Skip if they look dry.</span>
            </span>
          </Checkbox>
        </div>
      </Specimen>
    </Section>
  );
}
