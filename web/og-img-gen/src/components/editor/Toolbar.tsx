import { toPng } from "html-to-image";
import {
  Type,
  Image,
  Badge,
  Square,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  FileJson,
  Grid3X3,
  Magnet,
} from "lucide-react";
import type { MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useEditorStore } from "@/stores/editor-store";
import type { ElementType, Template } from "@/types/editor";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTemplate(value: unknown): value is Template {
  if (!isRecord(value)) {
    return false;
  }

  const template = value;
  return (
    typeof template["id"] === "string" &&
    typeof template["name"] === "string" &&
    typeof template["description"] === "string" &&
    typeof template["createdAt"] === "string" &&
    typeof template["updatedAt"] === "string" &&
    Array.isArray(template["elements"]) &&
    typeof template["canvasBackground"] === "string" &&
    Array.isArray(template["variables"])
  );
}

export function Toolbar() {
  const addElement = useEditorStore((s) => s.addElement);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const gridEnabled = useEditorStore((s) => s.gridEnabled);
  const setGridEnabled = useEditorStore((s) => s.setGridEnabled);
  const gridSize = useEditorStore((s) => s.gridSize);
  const setGridSize = useEditorStore((s) => s.setGridSize);
  const showGrid = useEditorStore((s) => s.showGrid);
  const setShowGrid = useEditorStore((s) => s.setShowGrid);
  const currentTemplateId = useEditorStore((s) => s.currentTemplateId);
  const templates = useEditorStore((s) => s.templates);
  const exportTemplate = useEditorStore((s) => s.exportTemplate);
  const importTemplate = useEditorStore((s) => s.importTemplate);
  const updateTemplate = useEditorStore((s) => s.updateTemplate);

  const template = templates.find((t) => t.id === currentTemplateId);

  const handleAddElement = (type: ElementType) => {
    addElement(type);
  };

  const handleExportPNG = async (event: MouseEvent<HTMLButtonElement>) => {
    const ownerDocument = event.currentTarget.ownerDocument;
    const shell = event.currentTarget.closest("[data-editor-shell]");
    const canvas = shell?.querySelector<HTMLElement>("[data-og-canvas]");
    if (!canvas) {
      return;
    }

    const dataUrl = await toPng(canvas, {
      width: 1200,
      height: 630,
      pixelRatio: 2,
    });

    const link = ownerDocument.createElement("a");
    link.download = `${template?.name || "og-image"}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleExportJSON = () => {
    if (!currentTemplateId) {
      return;
    }
    const data = exportTemplate(currentTemplateId);
    if (!data) {
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${data.name}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (event: MouseEvent<HTMLButtonElement>) => {
    const ownerDocument = event.currentTarget.ownerDocument;
    const input = ownerDocument.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }

      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isTemplate(parsed)) {
        return;
      }

      const data: Template = parsed;
      importTemplate(data);
    });
    input.click();
  };

  return (
    <div className="flex min-h-12 items-center gap-2 overflow-x-auto border-b bg-card/50 px-3 py-2">
      {/* Template name */}
      {template && (
        <Input
          value={template.name}
          onChange={(e) => updateTemplate(template.id, { name: e.target.value })}
          className="w-48"
        />
      )}

      <Separator orientation="vertical" className="h-6" />

      {/* Add elements */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddElement("text")}
          title="Add Text"
        >
          <Type className="size-4" />
          Text
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddElement("image")}
          title="Add Image"
        >
          <Image className="size-4" />
          Image
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddElement("badge")}
          title="Add Badge"
        >
          <Badge className="size-4" />
          Badge
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddElement("container")}
          title="Add Container"
        >
          <Square className="size-4" />
          Container
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <Button size="icon-sm" variant="outline" onClick={() => setZoom(zoom - 0.1)}>
          <ZoomOut className="size-4" />
        </Button>
        <Select
          value={String(Math.round(zoom * 100))}
          onValueChange={(v) => setZoom(Number(v) / 100)}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="50">50%</SelectItem>
            <SelectItem value="75">75%</SelectItem>
            <SelectItem value="100">100%</SelectItem>
            <SelectItem value="125">125%</SelectItem>
            <SelectItem value="150">150%</SelectItem>
          </SelectContent>
        </Select>
        <Button size="icon-sm" variant="outline" onClick={() => setZoom(zoom + 0.1)}>
          <ZoomIn className="size-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Grid controls */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={gridEnabled ? "default" : "outline"}
          onClick={() => setGridEnabled(!gridEnabled)}
          title={gridEnabled ? "Disable snap to grid" : "Enable snap to grid"}
        >
          <Magnet className="size-4" />
          Snap
        </Button>
        <Button
          size="sm"
          variant={showGrid ? "default" : "outline"}
          onClick={() => setShowGrid(!showGrid)}
          title={showGrid ? "Hide grid" : "Show grid"}
        >
          <Grid3X3 className="size-4" />
        </Button>
        <Select value={String(gridSize)} onValueChange={(v) => setGridSize(Number(v))}>
          <SelectTrigger className="w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="8">8px</SelectItem>
            <SelectItem value="12">12px</SelectItem>
            <SelectItem value="16">16px</SelectItem>
            <SelectItem value="24">24px</SelectItem>
            <SelectItem value="32">32px</SelectItem>
            <SelectItem value="48">48px</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1" />

      {/* Export/Import */}
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={handleImportJSON} title="Import Template">
          <Upload className="size-4" />
          Import
        </Button>
        <Button size="sm" variant="outline" onClick={handleExportJSON} title="Export Template">
          <FileJson className="size-4" />
          Export JSON
        </Button>
        <Button size="sm" onClick={handleExportPNG} title="Download PNG">
          <Download className="size-4" />
          Download PNG
        </Button>
      </div>
    </div>
  );
}
