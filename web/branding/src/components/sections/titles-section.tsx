import { Button, Input } from "@jfa.dev/common/ui";

import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function TitlesSection() {
  return (
    <Section
      description="Keweke list titles are Zilla Slab, uppercase, tight tracking. The editor keeps that size so Save and Cancel sit beside it."
      id="titles"
      title="Titles"
    >
      <Specimen label="Display">
        <h3 className="w-full text-left type-page-title font-serif">Weekend groceries</h3>
      </Specimen>
      <Specimen label="Edit">
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full items-stretch gap-1.5">
            <Input
              aria-label="List title"
              className="h-auto min-h-14 min-w-0 flex-1 py-1 type-page-title font-serif sm:min-h-20 sm:min-w-64"
              readOnly
              value="Weekend groceries"
            />
            <div className="flex min-h-14 flex-col items-stretch justify-between gap-1.5 sm:min-h-20">
              <Button size="lg">Save</Button>
              <Button size="lg" variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </Specimen>
    </Section>
  );
}
