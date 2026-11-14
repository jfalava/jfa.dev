import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  buttonVariants,
} from "@jfa.dev/common/ui";
import { useState } from "react";

import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function PopoverSection() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Weekend groceries");
  return (
    <Section
      id="popover"
      title="Popover"
      description="A named, non-destructive editing surface. Tab moves between fields; Escape or Done closes it and restores focus to the trigger."
    >
      <Specimen label="Controlled editor">
        <Popover isOpen={open} onOpenChange={setOpen}>
          <PopoverTrigger className={buttonVariants({ variant: "outline" })}>
            Edit sample name
          </PopoverTrigger>
          <PopoverContent aria-label="Sample name editor">
            <div className="space-y-3">
              <label htmlFor="popover-sample-name" className="type-ui font-medium">
                Sample name
              </label>
              <Input
                id="popover-sample-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Button onPress={() => setOpen(false)}>Done</Button>
            </div>
          </PopoverContent>
        </Popover>
        <p className="type-meta break-words">Current name: {name || "Untitled"}</p>
      </Specimen>
    </Section>
  );
}
