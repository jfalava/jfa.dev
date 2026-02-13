import { Paintbrush } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEditorStore } from "@/stores/editor-store";

export function CanvasSettings() {
  const currentTemplateId = useEditorStore((s) => s.currentTemplateId);
  const templates = useEditorStore((s) => s.templates);
  const updateTemplate = useEditorStore((s) => s.updateTemplate);

  const template = templates.find((t) => t.id === currentTemplateId);

  if (!template) {
    return null;
  }

  return (
    <div className="editor-panel-section">
      <div className="flex items-center gap-2 border-b border-border/60 p-3">
        <Paintbrush className="size-4" />
        <span className="text-sm font-medium">Canvas Settings</span>
      </div>

      <div className="space-y-3 p-3">
        <div>
          <Label className="text-xs">Description</Label>
          <Input
            value={template.description}
            onChange={(e) => updateTemplate(template.id, { description: e.target.value })}
            placeholder="Template description..."
          />
        </div>

        <div>
          <Label className="text-xs">Background</Label>
          <Textarea
            value={template.canvasBackground}
            onChange={(e) => updateTemplate(template.id, { canvasBackground: e.target.value })}
            placeholder="CSS background value..."
            rows={2}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Supports colors, gradients, and images. e.g. <code>#000</code>,{" "}
            <code>linear-gradient(...)</code>
          </p>
        </div>

        {/* Quick background presets */}
        <div>
          <Label className="text-xs">Presets</Label>
          <div className="mt-1 flex flex-wrap gap-1">
            {[
              { label: "Dark", value: "linear-gradient(135deg, hsl(0 0% 0%), hsl(0 0% 7%))" },
              { label: "Light", value: "linear-gradient(135deg, #f5f5f5, #e0e0e0)" },
              { label: "Blue", value: "linear-gradient(135deg, #1e3a5f, #0d1b2a)" },
              { label: "Purple", value: "linear-gradient(135deg, #2d1b4e, #1a0f2e)" },
              { label: "Green", value: "linear-gradient(135deg, #1b4332, #0d2818)" },
              { label: "Orange", value: "linear-gradient(135deg, #5c3d2e, #2d1e17)" },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => updateTemplate(template.id, { canvasBackground: preset.value })}
                className="rounded-md border border-border/70 px-2 py-1 text-xs transition-transform hover:scale-[1.02]"
                style={{ background: preset.value }}
              >
                <span className="text-white drop-shadow">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
