import { Checkbox } from "@jfa.dev/common/ui";

import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function CheckboxSection() {
  return (
    <Section
      description="Aria Checkbox. Uses render-prop internally for the check mark. Supports indeterminate and disabled."
      id="checkbox"
      title="Checkbox"
    >
      <Card>
        <Preview label="states">
          <div className="flex flex-wrap gap-6">
            <Checkbox>Unchecked</Checkbox>
            <Checkbox defaultSelected>Checked</Checkbox>
            <Checkbox isIndeterminate>Indeterminate</Checkbox>
            <Checkbox isDisabled>Disabled</Checkbox>
            <Checkbox defaultSelected isDisabled>
              Disabled checked
            </Checkbox>
          </div>
        </Preview>
        <Preview label="with description">
          <div className="grid w-full max-w-sm gap-4">
            <Checkbox defaultSelected>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm leading-none font-medium">Email notifications</span>
                <span className="text-xs text-muted-foreground">Receive weekly digests.</span>
              </span>
            </Checkbox>
            <Checkbox>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm leading-none font-medium">Marketing emails</span>
                <span className="text-xs text-muted-foreground">Product updates and offers.</span>
              </span>
            </Checkbox>
          </div>
        </Preview>
      </Card>
    </Section>
  );
}
