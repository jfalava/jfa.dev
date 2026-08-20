import { Button, Input } from "@jfa.dev/common/ui";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlignCenter,
  Boxes,
  ChevronDown,
  ChevronRight,
  Eye,
  Frame,
  Hand,
  Image,
  Layers3,
  MoreHorizontal,
  MousePointer2,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Square,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: EditorScaffold });

function EditorScaffold() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/25">
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[16rem_minmax(0,1fr)_18rem]">
        <LayersPanel />
        <CanvasWorkspace />
        <PropertiesPanel />
      </div>
    </div>
  );
}

function LayersPanel() {
  return (
    <aside
      aria-label="Layers"
      className="flex min-h-60 flex-col border-b border-border bg-background lg:min-h-0 lg:border-r lg:border-b-0"
    >
      <PanelHeader icon={Layers3} label="Layers">
        <Button aria-label="Add layer" size="icon-xs" variant="ghost">
          <Plus />
        </Button>
        <Button aria-label="Layer options" size="icon-xs" variant="ghost">
          <MoreHorizontal />
        </Button>
      </PanelHeader>
      <div className="border-b border-border p-3">
        <Input aria-label="Search layers" placeholder="Search layers" />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <LayerRow icon={Type} label="Headline" detail="Text" selected />
        <LayerRow icon={Type} label="Supporting copy" detail="Text" />
        <LayerRow icon={Square} label="Accent block" detail="Shape" />
        <LayerRow icon={Image} label="Background image" detail="Image" />
        <LayerRow icon={Frame} label="Frame" detail="Canvas" />
      </div>
      <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
        5 layers · 1200 × 630 px
      </div>
    </aside>
  );
}

function CanvasWorkspace() {
  return (
    <section aria-label="Canvas" className="flex min-h-[34rem] min-w-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-background px-3">
        <div className="flex items-center gap-1">
          <ToolButton icon={MousePointer2} label="Select" active />
          <ToolButton icon={Hand} label="Pan" />
          <span className="mx-2 h-4 w-px bg-border" />
          <ToolButton icon={Undo2} label="Undo" />
          <ToolButton icon={Redo2} label="Redo" />
        </div>
        <div className="flex items-center gap-1">
          <ToolButton icon={ZoomOut} label="Zoom out" />
          <span className="min-w-10 text-center text-[11px] text-muted-foreground">100%</span>
          <ToolButton icon={ZoomIn} label="Zoom in" />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto [background-image:linear-gradient(45deg,rgba(127,127,127,0.08)_25%,transparent_25%),linear-gradient(-45deg,rgba(127,127,127,0.08)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(127,127,127,0.08)_75%),linear-gradient(-45deg,transparent_75%,rgba(127,127,127,0.08)_75%)] [background-size:16px_16px] [background-position:0_0,0_0,8px_8px,-8px_8px] p-6">
        <div className="relative aspect-[1200/630] w-full max-w-4xl overflow-hidden rounded-sm border border-border bg-[#f5f1ea] shadow-2xl shadow-black/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.92),transparent_28%),linear-gradient(135deg,#f5f1ea_0%,#e6d9c8_100%)]" />
          <div className="absolute top-[14%] left-[9%] size-[16%] rounded-full bg-[#d6ff48] shadow-[0_18px_40px_rgba(102,124,21,0.22)]" />
          <div className="absolute top-[18%] right-[10%] text-right text-[clamp(0.6rem,1.4vw,1rem)] font-medium tracking-[0.3em] text-[#6e665a] uppercase">
            OpenGraph / 01
          </div>
          <div className="absolute bottom-[13%] left-[9%] max-w-[70%]">
            <div className="text-[clamp(1.5rem,5vw,5.5rem)] leading-[0.9] font-semibold tracking-[-0.06em] text-[#2f302c]">
              Make it
              <br />
              unmistakable.
            </div>
            <div className="mt-[5%] text-[clamp(0.65rem,1.4vw,1.05rem)] text-[#6e665a]">
              A visual workspace for the web.
            </div>
          </div>
          <div className="absolute right-[9%] bottom-[12%] flex size-[14%] items-center justify-center rounded-full border border-[#2f302c]/20 text-[#2f302c]">
            <ArrowMark />
          </div>
          <div className="pointer-events-none absolute inset-[8%] rounded border border-primary/60 ring-4 ring-primary/10" />
        </div>
      </div>

      <div className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-background px-3 text-[10px] text-muted-foreground">
        <span>Untitled canvas</span>
        <div className="flex items-center gap-3">
          <span>Snap: on</span>
          <span>Guides: on</span>
        </div>
      </div>
    </section>
  );
}

function PropertiesPanel() {
  return (
    <aside
      aria-label="Design properties"
      className="flex min-h-80 flex-col border-t border-border bg-background lg:min-h-0 lg:border-t-0 lg:border-l"
    >
      <PanelHeader icon={SlidersHorizontal} label="Design">
        <Button aria-label="Reset properties" size="icon-xs" variant="ghost">
          <RotateCcw />
        </Button>
      </PanelHeader>
      <div className="flex border-b border-border px-3">
        <button
          className="border-b-2 border-primary px-2 py-2 text-[11px] font-medium text-primary"
          type="button"
        >
          Properties
        </button>
        <button className="px-2 py-2 text-[11px] text-muted-foreground" type="button">
          Styles
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <PropertySection icon={Frame} label="Position & size">
          <div className="grid grid-cols-2 gap-2">
            <PropertyValue label="X" value="108" />
            <PropertyValue label="Y" value="92" />
            <PropertyValue label="W" value="840" />
            <PropertyValue label="H" value="280" />
          </div>
        </PropertySection>
        <PropertySection icon={Palette} label="Appearance">
          <div className="space-y-2">
            <PropertyValue label="Font" value="Pretendard / 600" wide />
            <PropertyValue label="Size" value="88 px" />
            <div className="flex items-center justify-between rounded border border-border bg-muted/30 px-2 py-1.5 text-[11px]">
              <span className="text-muted-foreground">Color</span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="size-3 rounded-sm bg-[#2f302c]" /> #2F302C
              </span>
            </div>
          </div>
        </PropertySection>
        <PropertySection icon={AlignCenter} label="Alignment">
          <div className="grid grid-cols-4 gap-1">
            <ToolButton icon={AlignCenter} label="Align left" />
            <ToolButton icon={AlignCenter} label="Align center" active />
            <ToolButton icon={AlignCenter} label="Align right" />
            <ToolButton icon={Boxes} label="Distribute" />
          </div>
        </PropertySection>
      </div>
    </aside>
  );
}

function PanelHeader({
  children,
  icon: Icon,
  label,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
      <div className="flex items-center gap-2 text-xs font-medium">
        <Icon className="size-3.5 text-primary" />
        {label}
      </div>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  );
}

function LayerRow({
  detail,
  icon: Icon,
  label,
  selected = false,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  selected?: boolean;
}) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-md px-2 py-2 text-xs ${selected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
    >
      <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
      <Icon className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-[10px] text-muted-foreground group-hover:hidden">{detail}</span>
      <Eye className="hidden size-3.5 text-muted-foreground group-hover:block" />
    </div>
  );
}

function PropertySection({
  children,
  icon: Icon,
  label,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <section className="border-b border-border py-4 first:pt-0 last:border-b-0">
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-medium">
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
        <ChevronDown className="ml-auto size-3.5 text-muted-foreground" />
      </h2>
      {children}
    </section>
  );
}

function PropertyValue({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded border border-border bg-muted/30 px-2 py-1.5 text-[11px] ${wide ? "col-span-2" : ""}`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate pl-2 font-medium">{value}</span>
    </div>
  );
}

function ToolButton({
  active = false,
  icon: Icon,
  label,
}: {
  active?: boolean;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Button
      aria-label={label}
      className={active ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : ""}
      size="icon-xs"
      variant="ghost"
    >
      <Icon />
    </Button>
  );
}

function ArrowMark() {
  return (
    <svg aria-hidden="true" className="size-1/2" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 19 19 5M8 5h11v11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
