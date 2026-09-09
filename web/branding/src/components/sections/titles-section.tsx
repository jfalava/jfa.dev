import { Button, Input } from "@jfa.dev/common/ui";

import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

const DISPLAY_TITLE_CLASS_NAME =
  "font-serif text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl";
const EDIT_TITLE_CLASS_NAME =
  "h-14 min-w-0 flex-1 py-1 font-serif text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:h-20 sm:min-w-64 sm:text-6xl md:text-6xl";

export function TitlesSection() {
  return (
    <Section
      description="Keweke list titles are Zilla Slab, uppercase, tight tracking. The editor keeps that size so Save and Cancel sit beside it."
      id="titles"
      title="Titles"
    >
      <Specimen label="Display">
        <h3 className={`w-full text-left ${DISPLAY_TITLE_CLASS_NAME}`}>Weekend groceries</h3>
      </Specimen>
      <Specimen label="Edit">
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full items-end gap-1.5">
            <Input
              aria-label="List title"
              className={EDIT_TITLE_CLASS_NAME}
              readOnly
              value="Weekend groceries"
            />
            <Button size="lg">Save</Button>
            <Button size="lg" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </Specimen>
    </Section>
  );
}
