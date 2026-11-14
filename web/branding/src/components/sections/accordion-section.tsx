import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@jfa.dev/common/ui";

import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function AccordionSection() {
  return (
    <Section
      id="accordion"
      title="Accordion"
      description="Related disclosures, with one open at a time. Tab to a heading and use Enter or Space to expand it."
    >
      <Specimen label="Expanded, collapsed and disabled">
        <Accordion defaultExpandedKeys={["identity"]} className="max-w-xl">
          <AccordionItem id="identity">
            <AccordionHeader>
              <AccordionTrigger>Keep the identity</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>
              Use the shared palette and type roles. Artwork may have its own typography.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem id="adoption">
            <AccordionHeader>
              <AccordionTrigger>Adopt components on demand</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>
              Bring in a component when an app needs it, then document its states here.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem id="unavailable" isDisabled>
            <AccordionHeader>
              <AccordionTrigger>Unavailable disclosure</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>This disclosure is disabled.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Specimen>
    </Section>
  );
}
