import { Input } from "@jfa.dev/common/ui";

import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function InputSection() {
  return (
    <Section
      description="Aria Input primitive. Invalid state uses aria-invalid styling; file input has built-in file:: styles."
      id="input"
      title="Input"
    >
      <Card>
        <Preview label="basic">
          <div className="grid w-full max-w-sm gap-4">
            <Input placeholder="you@example.com" type="email" />
            <div className="grid gap-1.5">
              <label className="text-xs font-medium" htmlFor="branding-email">
                Email
              </label>
              <Input id="branding-email" placeholder="you@example.com" type="email" />
              <p className="text-xs text-muted-foreground">We&apos;ll never share your email.</p>
            </div>
          </div>
        </Preview>
        <Preview label="states">
          <div className="grid w-full max-w-sm gap-3">
            <Input disabled placeholder="Disabled" value="can’t edit this" />
            <Input aria-invalid="true" defaultValue="not-an-email" placeholder="Invalid" />
            <Input placeholder="Search…" type="search" />
          </div>
        </Preview>
        <Preview label="file">
          <div className="w-full max-w-sm">
            <Input type="file" />
          </div>
        </Preview>
      </Card>
    </Section>
  );
}
