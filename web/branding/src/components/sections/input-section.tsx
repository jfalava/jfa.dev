import { Input } from "@jfa.dev/common/ui";

import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function InputSection() {
  return (
    <Section
      description="Aria Input. Invalid uses aria-invalid. File inputs keep the built-in file:: styles. Typed fields use Zilla Slab."
      id="input"
      title="Input"
    >
      <Specimen label="Basic">
        <div className="grid w-full max-w-sm gap-4">
          <Input placeholder="Weekend groceries" />
          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="branding-list-title">
              List title
            </label>
            <Input id="branding-list-title" placeholder="Weekend groceries" />
          </div>
        </div>
      </Specimen>
      <Specimen label="States">
        <div className="grid w-full max-w-sm gap-3">
          <Input disabled placeholder="Locked title" value="Weekend groceries" />
          <Input aria-invalid="true" defaultValue="   " placeholder="Title can't be empty" />
          <Input placeholder="Find a service" type="search" />
        </div>
      </Specimen>
      <Specimen label="File">
        <div className="w-full max-w-sm">
          <Input type="file" />
        </div>
      </Specimen>
    </Section>
  );
}
