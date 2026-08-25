import { createFileRoute } from "@tanstack/react-router";

import { ButtonSection } from "@/components/sections/button-section";
import { CheckboxSection } from "@/components/sections/checkbox-section";
import { ColorsSection } from "@/components/sections/colors-section";
import { DialogSection } from "@/components/sections/dialog-section";
import { DropdownMenuSection } from "@/components/sections/dropdown-menu-section";
import { InputSection } from "@/components/sections/input-section";
import { KbdSection } from "@/components/sections/kbd-section";
import { SiteHeaderSection } from "@/components/sections/site-header-section";
import { SonnerSection } from "@/components/sections/sonner-section";
import { TableSection } from "@/components/sections/table-section";
import { TypographySection } from "@/components/sections/typography-section";

export const Route = createFileRoute("/")({ component: BrandingPage });

const NAV = [
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "button", label: "Button" },
  { id: "input", label: "Input" },
  { id: "checkbox", label: "Checkbox" },
  { id: "dropdown-menu", label: "Dropdown" },
  { id: "dialog", label: "Dialog" },
  { id: "table", label: "Table" },
  { id: "kbd", label: "KBD" },
  { id: "sonner", label: "Sonner" },
  { id: "site-header", label: "SiteHeader" },
] as const;

function BrandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-4 border-b border-border pb-8">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-[0.12em] text-primary uppercase">
            JFA design system
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Branding</h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
            Single-page reference for every component in{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              @jfa.dev/common/ui
            </code>
            .
          </p>
        </div>

        <nav aria-label="Jump to section" className="flex flex-wrap gap-1.5">
          {NAV.map((item) => (
            <a
              className="rounded-full border border-border bg-muted/50 px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              href={`#${item.id}`}
              key={item.id}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-12 py-8">
        <ColorsSection />
        <TypographySection />
        <ButtonSection />
        <InputSection />
        <CheckboxSection />
        <DropdownMenuSection />
        <DialogSection />
        <TableSection />
        <KbdSection />
        <SonnerSection />
        <SiteHeaderSection />
      </div>
    </main>
  );
}
