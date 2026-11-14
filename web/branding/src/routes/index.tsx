import { createFileRoute } from "@tanstack/react-router";

import { AccordionSection } from "@/components/sections/accordion-section";
import { ButtonSection } from "@/components/sections/button-section";
import { CheckboxSection } from "@/components/sections/checkbox-section";
import { ColorPickerSection } from "@/components/sections/color-picker-section";
import { ColorsSection } from "@/components/sections/colors-section";
import { ContextMenuSection } from "@/components/sections/context-menu-section";
import { DialogSection } from "@/components/sections/dialog-section";
import { DropdownMenuSection } from "@/components/sections/dropdown-menu-section";
import { InputSection } from "@/components/sections/input-section";
import { KbdSection } from "@/components/sections/kbd-section";
import { LayoutSection } from "@/components/sections/layout-section";
import { PopoverSection } from "@/components/sections/popover-section";
import { ResizableSection } from "@/components/sections/resizable-section";
import { SiteHeaderSection } from "@/components/sections/site-header-section";
import { SonnerSection } from "@/components/sections/sonner-section";
import { TableSection } from "@/components/sections/table-section";
import { TitlesSection } from "@/components/sections/titles-section";
import { ToggleSection } from "@/components/sections/toggle-section";
import { TypographySection } from "@/components/sections/typography-section";

export const Route = createFileRoute("/")({ component: BrandingPage });

const NAV = [
  { id: "typography", label: "Typography" },
  { id: "titles", label: "Titles" },
  { id: "colors", label: "Colors" },
  { id: "layout", label: "Layout" },
  { id: "button", label: "Button" },
  { id: "input", label: "Input" },
  { id: "checkbox", label: "Checkbox" },
  { id: "accordion", label: "Accordion" },
  { id: "color-picker", label: "Color picker" },
  { id: "context-menu", label: "Context menu" },
  { id: "popover", label: "Popover" },
  { id: "resizable", label: "Resizable" },
  { id: "toggle", label: "Toggle" },
  { id: "dropdown-menu", label: "Dropdown" },
  { id: "dialog", label: "Dialog" },
  { id: "table", label: "Table" },
  { id: "kbd", label: "Kbd" },
  { id: "sonner", label: "Toaster" },
  { id: "site-header", label: "SiteHeader" },
] as const;

function BrandingPage() {
  return (
    <main className="flex w-full flex-1 flex-col page-gutters py-10">
      <header className="max-w-3xl space-y-8 pb-10">
        <div className="space-y-6">
          <h1 className="type-page-title">Branding</h1>
          <div className="space-y-1">
            <p className="font-sans text-2xl font-semibold tracking-tight sm:text-4xl">jfa.dev</p>
            <p className="font-serif text-2xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-4xl">
              Weekend groceries
            </p>
            <p className="font-mono text-lg sm:text-2xl">⌘⇧U</p>
          </div>
          <p className="reading-measure type-body text-muted-foreground">
            Shared components for the toolbox. Theme toggle is in the header.
          </p>
        </div>
        <nav aria-label="Jump to section" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {NAV.map((item) => (
            <a href={`#${item.id}`} key={item.id}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="divide-y divide-border border-t border-border">
        <TypographySection />
        <TitlesSection />
        <ColorsSection />
        <LayoutSection />
        <ButtonSection />
        <InputSection />
        <CheckboxSection />
        <AccordionSection />
        <ColorPickerSection />
        <ContextMenuSection />
        <PopoverSection />
        <ResizableSection />
        <ToggleSection />
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
