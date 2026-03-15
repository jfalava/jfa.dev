import { Trash2, Copy, Lock, Unlock, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEditorStore } from "@/stores/editor-store";
import type { TextContent, ImageContent, BadgeContent, ContainerContent } from "@/types/editor";

export function PropertiesPanel() {
  const selectedElementId = useEditorStore((s) => s.selectedElementId);
  const currentTemplateId = useEditorStore((s) => s.currentTemplateId);
  const templates = useEditorStore((s) => s.templates);
  const fonts = useEditorStore((s) => s.fonts);
  const updateElement = useEditorStore((s) => s.updateElement);
  const deleteElement = useEditorStore((s) => s.deleteElement);
  const duplicateElement = useEditorStore((s) => s.duplicateElement);
  const reorderElement = useEditorStore((s) => s.reorderElement);

  const template = templates.find((t) => t.id === currentTemplateId);
  const element = template?.elements.find((el) => el.id === selectedElementId);

  if (!element) {
    return (
      <div className="h-full w-full rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Select an element to edit its properties</p>
      </div>
    );
  }

  const updateContent = <T extends typeof element.content>(updates: Partial<T>) => {
    updateElement(element.id, {
      content: { ...element.content, ...updates } as typeof element.content,
    });
  };

  return (
    <div className="h-full w-full overflow-y-auto rounded-lg border bg-card">
      <div className="border-b border-border/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium capitalize">{element.type}</span>
          <div className="flex gap-1">
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => updateElement(element.id, { visible: !element.visible })}
              title={element.visible ? "Hide" : "Show"}
            >
              {element.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => updateElement(element.id, { locked: !element.locked })}
              title={element.locked ? "Unlock" : "Lock"}
            >
              {element.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => reorderElement(element.id, "up")}
              title="Bring Forward"
            >
              <ChevronUp className="size-3" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => reorderElement(element.id, "down")}
              title="Send Backward"
            >
              <ChevronDown className="size-3" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => duplicateElement(element.id)}
              title="Duplicate"
            >
              <Copy className="size-3" />
            </Button>
            <Button
              size="icon-xs"
              variant="destructive"
              onClick={() => deleteElement(element.id)}
              title="Delete"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>

        {/* Position & Size */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">X</Label>
            <Input
              type="number"
              value={Math.round(element.position.x)}
              onChange={(e) =>
                updateElement(element.id, {
                  position: { ...element.position, x: Number(e.target.value) },
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Y</Label>
            <Input
              type="number"
              value={Math.round(element.position.y)}
              onChange={(e) =>
                updateElement(element.id, {
                  position: { ...element.position, y: Number(e.target.value) },
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              value={Math.round(element.size.width)}
              onChange={(e) =>
                updateElement(element.id, {
                  size: { ...element.size, width: Number(e.target.value) },
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              value={Math.round(element.size.height)}
              onChange={(e) =>
                updateElement(element.id, {
                  size: { ...element.size, height: Number(e.target.value) },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Tailwind Classes */}
      <div className="border-b border-border/60 p-4">
        <Label className="text-xs">Tailwind Classes</Label>
        <Input
          value={element.tailwindClasses}
          onChange={(e) => updateElement(element.id, { tailwindClasses: e.target.value })}
          placeholder="e.g. shadow-lg rounded-lg"
        />
      </div>

      {/* Type-specific properties */}
      <div className="space-y-3 p-4">
        {element.content.type === "text" && (
          <TextProperties content={element.content} onChange={updateContent} fonts={fonts} />
        )}
        {element.content.type === "image" && (
          <ImageProperties content={element.content} onChange={updateContent} />
        )}
        {element.content.type === "badge" && (
          <BadgeProperties content={element.content} onChange={updateContent} fonts={fonts} />
        )}
        {element.content.type === "container" && (
          <ContainerProperties content={element.content} onChange={updateContent} />
        )}
      </div>
    </div>
  );
}

interface TextPropertiesProps {
  content: TextContent;
  onChange: (updates: Partial<TextContent>) => void;
  fonts: { family: string }[];
}

function TextProperties({ content, onChange, fonts }: TextPropertiesProps) {
  return (
    <>
      <div>
        <Label className="text-xs">Text</Label>
        <Textarea
          value={content.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Enter text or use {{variable}}"
          rows={3}
        />
      </div>
      <div>
        <Label className="text-xs">Font Family</Label>
        <Select
          value={content.fontFamily ?? undefined}
          onValueChange={(v) => onChange({ fontFamily: v ?? content.fontFamily })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fonts.map((f) => (
              <SelectItem key={f.family} value={f.family}>
                {f.family}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Font Size</Label>
          <Input
            type="number"
            value={content.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Font Weight</Label>
          <Select
            value={String(content.fontWeight)}
            onValueChange={(v) => onChange({ fontWeight: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="400">Regular</SelectItem>
              <SelectItem value="500">Medium</SelectItem>
              <SelectItem value="600">Semibold</SelectItem>
              <SelectItem value="700">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Line Height</Label>
          <Input
            type="number"
            step="0.1"
            value={content.lineHeight}
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Align</Label>
          <Select
            value={content.textAlign}
            onValueChange={(v) => onChange({ textAlign: v ?? content.textAlign })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={content.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-8 w-10 cursor-pointer border border-input"
          />
          <Input value={content.color} onChange={(e) => onChange({ color: e.target.value })} />
        </div>
      </div>
    </>
  );
}

interface ImagePropertiesProps {
  content: ImageContent;
  onChange: (updates: Partial<ImageContent>) => void;
}

function ImageProperties({ content, onChange }: ImagePropertiesProps) {
  return (
    <>
      <div>
        <Label className="text-xs">Image URL</Label>
        <Input
          value={content.src}
          onChange={(e) => onChange({ src: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div>
        <Label className="text-xs">Object Fit</Label>
        <Select
          value={content.objectFit}
          onValueChange={(v) => onChange({ objectFit: v ?? content.objectFit })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="fill">Fill</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Border Radius</Label>
        <Input
          type="number"
          value={content.borderRadius}
          onChange={(e) => onChange({ borderRadius: Number(e.target.value) })}
        />
      </div>
    </>
  );
}

interface BadgePropertiesProps {
  content: BadgeContent;
  onChange: (updates: Partial<BadgeContent>) => void;
  fonts: { family: string }[];
}

function BadgeProperties({ content, onChange, fonts }: BadgePropertiesProps) {
  return (
    <>
      <div>
        <Label className="text-xs">Text</Label>
        <Input value={content.text} onChange={(e) => onChange({ text: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs">Font Family</Label>
        <Select
          value={content.fontFamily ?? undefined}
          onValueChange={(v) => onChange({ fontFamily: v ?? content.fontFamily })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fonts.map((f) => (
              <SelectItem key={f.family} value={f.family}>
                {f.family}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Font Size</Label>
          <Input
            type="number"
            value={content.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Font Weight</Label>
          <Select
            value={String(content.fontWeight)}
            onValueChange={(v) => onChange({ fontWeight: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="400">Regular</SelectItem>
              <SelectItem value="500">Medium</SelectItem>
              <SelectItem value="600">Semibold</SelectItem>
              <SelectItem value="700">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Background Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={content.backgroundColor.startsWith("rgba") ? "#3b82f6" : content.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            className="h-8 w-10 cursor-pointer border border-input"
          />
          <Input
            value={content.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Text Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={content.textColor}
            onChange={(e) => onChange({ textColor: e.target.value })}
            className="h-8 w-10 cursor-pointer border border-input"
          />
          <Input
            value={content.textColor}
            onChange={(e) => onChange({ textColor: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Border Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={content.borderColor.startsWith("rgba") ? "#3b82f6" : content.borderColor}
            onChange={(e) => onChange({ borderColor: e.target.value })}
            className="h-8 w-10 cursor-pointer border border-input"
          />
          <Input
            value={content.borderColor}
            onChange={(e) => onChange({ borderColor: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Radius</Label>
          <Input
            type="number"
            value={content.borderRadius}
            onChange={(e) => onChange({ borderRadius: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Pad X</Label>
          <Input
            type="number"
            value={content.paddingX}
            onChange={(e) => onChange({ paddingX: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Pad Y</Label>
          <Input
            type="number"
            value={content.paddingY}
            onChange={(e) => onChange({ paddingY: Number(e.target.value) })}
          />
        </div>
      </div>
    </>
  );
}

interface ContainerPropertiesProps {
  content: ContainerContent;
  onChange: (updates: Partial<ContainerContent>) => void;
}

function ContainerProperties({ content, onChange }: ContainerPropertiesProps) {
  return (
    <>
      <div>
        <Label className="text-xs">Background Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={content.backgroundColor.startsWith("rgba") ? "#000000" : content.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            className="h-8 w-10 cursor-pointer border border-input"
          />
          <Input
            value={content.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Border Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={content.borderColor === "transparent" ? "#000000" : content.borderColor}
            onChange={(e) => onChange({ borderColor: e.target.value })}
            className="h-8 w-10 cursor-pointer border border-input"
          />
          <Input
            value={content.borderColor}
            onChange={(e) => onChange({ borderColor: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Border Width</Label>
          <Input
            type="number"
            value={content.borderWidth}
            onChange={(e) => onChange({ borderWidth: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Border Radius</Label>
          <Input
            type="number"
            value={content.borderRadius}
            onChange={(e) => onChange({ borderRadius: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Opacity</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          max="1"
          value={content.opacity}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
        />
      </div>
    </>
  );
}
