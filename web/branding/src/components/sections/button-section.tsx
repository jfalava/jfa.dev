import { Button, Kbd } from "@jfa.dev/common/ui";
import { ArrowRight, Mail, Plus, Search } from "lucide-react";

import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function ButtonSection() {
  return (
    <Section
      description="Variants and sizes from buttonVariants (cva). Focus ring uses ring tokens."
      id="button"
      title="Button"
    >
      <Card>
        <Preview label="variants">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </Preview>
        <Preview label="sizes">
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
        </Preview>
        <Preview label="with icons · data-icon tightens padding">
          <Button>
            <Mail data-icon="inline-start" />
            Login with email
          </Button>
          <Button variant="outline">
            Next
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button variant="secondary">
            <Search data-icon="inline-start" />
            Search
            <Kbd className="ml-1">⌘K</Kbd>
          </Button>
        </Preview>
        <Preview label="states">
          <Button isDisabled>Disabled</Button>
          <Button aria-busy="true" isDisabled>
            <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading
          </Button>
        </Preview>
      </Card>
    </Section>
  );
}
