import { Button, Kbd } from "@jfa.dev/common/ui";
import { Plus, Search } from "lucide-react";

import { Row, Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function ButtonSection() {
  return (
    <Section
      description="Variants and sizes from buttonVariants. Focus uses the ring token. data-icon tightens padding around inline icons."
      id="button"
      title="Button"
    >
      <Specimen label="Variants">
        <Row>
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </Row>
      </Specimen>
      <Specimen label="Sizes">
        <Row>
          <Button size="xs">xs</Button>
          <Button size="sm">sm</Button>
          <Button size="default">default</Button>
          <Button size="lg">lg</Button>
          <Button aria-label="Add" size="icon">
            <Plus />
          </Button>
          <Button aria-label="Add small" size="icon-sm">
            <Plus />
          </Button>
          <Button aria-label="Add extra small" size="icon-xs">
            <Plus />
          </Button>
          <Button aria-label="Add large" size="icon-lg">
            <Plus />
          </Button>
        </Row>
      </Specimen>
      <Specimen label="With icons">
        <Row>
          <Button>
            <Plus data-icon="inline-start" />
            New list
          </Button>
          <Button variant="secondary">
            <Search data-icon="inline-start" />
            Search
            <Kbd className="ml-1">⌘K</Kbd>
          </Button>
        </Row>
      </Specimen>
      <Specimen label="States">
        <Row>
          <Button isDisabled>Disabled</Button>
          <Button aria-busy="true" isDisabled>
            <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Saving
          </Button>
        </Row>
      </Specimen>
    </Section>
  );
}
