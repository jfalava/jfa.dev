import { Button, Kbd, KbdGroup, buttonVariants } from "@jfa.dev/common/ui";
import { ArrowUpRight, CodeXml, Monitor, PanelLeft, Plus, Search, UserRound } from "lucide-react";

import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function SiteHeaderSection() {
  return (
    <Section
      description="The shared header used by every web app. You’re already looking at it — sticky at the top of this page."
      id="site-header"
      title="SiteHeader"
    >
      <Card>
        <Preview label="header actions — normalized">
          <Button
            aria-label="Open search"
            variant="ghost"
            size="lg"
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <Search className="size-4" />
            <span>Search</span>
            <KbdGroup className="hidden gap-1 sm:inline-flex">
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">⌘</Kbd>
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">K</Kbd>
            </KbdGroup>
          </Button>
          <Button
            aria-label="Toggle sidebar"
            variant="ghost"
            size="lg"
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground aria-expanded:bg-transparent aria-expanded:text-muted-foreground"
          >
            <PanelLeft className="size-4" />
            <span>Toggle</span>
            <KbdGroup className="hidden gap-1 sm:inline-flex">
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">⌘</Kbd>
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">B</Kbd>
            </KbdGroup>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <Monitor className="size-4" />
            <span>System</span>
          </Button>
          <a
            href="https://github.com/jfalava/jfa.dev/tree/main/web/branding"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: "ghost",
              size: "lg",
              className: "gap-1.5 px-2 text-muted-foreground hover:text-foreground",
            })}
          >
            <CodeXml className="size-4" />
            <span>Source</span>
            <ArrowUpRight className="size-4" />
          </a>
          <Button
            variant="ghost"
            size="lg"
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <UserRound className="size-4" />
            <span>User</span>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4" />
            <span>New list</span>
            <KbdGroup className="hidden gap-1 sm:inline-flex">
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">⌘</Kbd>
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">E</Kbd>
            </KbdGroup>
          </Button>
        </Preview>
        <div className="space-y-3 px-6 py-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            All header actions share one visual language.
          </p>
        </div>
      </Card>
    </Section>
  );
}
