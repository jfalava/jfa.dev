import { Button, Input, Kbd, Toggle, buttonVariants } from "@jfa.dev/common/ui";
import { Plus, Search } from "lucide-react";

import { Row, Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function ButtonSection() {
  return (
    <Section
      description="Button, Toggle and Input default to auto density: compact on desktop, at least 44px targets below md (768px), with 16px entry text. Size controls the visual scale; density controls the touch minimum. Focus uses the ring token."
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
      <Specimen label="Density">
        <div className="grid gap-6 lg:grid-cols-3">
          {(["auto", "compact", "comfortable"] as const).map((density) => (
            <div key={density} className="space-y-3" data-density-example={density}>
              <p className="type-ui font-medium">{density}</p>
              <Row>
                <Button density={density}>Save</Button>
                <Button density={density} size="icon" aria-label={`Add (${density})`}>
                  <Plus />
                </Button>
                <a href="#input" className={buttonVariants({ density, variant: "outline" })}>
                  Inputs
                </a>
                <Toggle density={density} aria-label={`Pin (${density})`}>
                  Pin
                </Toggle>
              </Row>
              <label className="grid gap-2 type-ui">
                List name ({density})
                <Input density={density} defaultValue="Weekend groceries" />
              </label>
            </div>
          ))}
        </div>
        <p className="reading-measure type-ui text-muted-foreground">
          Comfortable keeps 44px targets at every width. Compact is an explicit exception for
          desktop editors and miniature specimens. Keep auto for ordinary forms. Custom typography
          can exceed the default entry size; do not shrink mobile text below 16px.
        </p>
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
