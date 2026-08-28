import { Button, Input } from "@jfa.dev/common/ui";

import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

const DISPLAY_TITLE_CLASS_NAME =
  "font-serif text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl";
const EDIT_TITLE_CLASS_NAME =
  "h-14 min-w-0 flex-1 py-1 font-serif text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:h-20 sm:min-w-64 sm:text-6xl md:text-6xl";

export function TitlesSection() {
  return (
    <Section
      description="User-editable titles use Zilla Slab with tight tracking and uppercase treatment. Editing keeps the same scale and leaves room for primary and secondary actions."
      id="titles"
      title="Titles"
    >
      <Card>
        <Preview label="display">
          <div className="w-full text-left">
            <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              list title
            </p>
            <h3 className={`mt-2 ${DISPLAY_TITLE_CLASS_NAME}`}>Your lists</h3>
          </div>
        </Preview>
        <Preview label="edit state">
          <div className="flex w-full flex-col gap-3">
            <div className="flex w-full items-end gap-1.5">
              <Input
                aria-label="List title"
                className={EDIT_TITLE_CLASS_NAME}
                readOnly
                value="Your lists"
              />
              <Button size="lg">Save</Button>
              <Button size="lg" variant="outline">
                Cancel
              </Button>
            </div>
            <p className="text-left text-sm text-muted-foreground">
              The editor expands to the available width while actions stay grouped at the edge.
            </p>
          </div>
        </Preview>
      </Card>
    </Section>
  );
}
