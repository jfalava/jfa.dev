import { Plus, Trash2, Copy, FileImage, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRESET_TEMPLATES } from "@/data/preset-templates";
import { useEditorStore } from "@/stores/editor-store";

export function TemplatesSidebar() {
  const [newName, setNewName] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const templates = useEditorStore((s) => s.templates);
  const currentTemplateId = useEditorStore((s) => s.currentTemplateId);
  const createTemplate = useEditorStore((s) => s.createTemplate);
  const deleteTemplate = useEditorStore((s) => s.deleteTemplate);
  const duplicateTemplate = useEditorStore((s) => s.duplicateTemplate);
  const setCurrentTemplate = useEditorStore((s) => s.setCurrentTemplate);
  const importTemplate = useEditorStore((s) => s.importTemplate);

  const handleCreate = () => {
    if (!newName.trim()) {
      return;
    }
    createTemplate(newName.trim());
    setNewName("");
  };

  const handleLoadPreset = (preset: (typeof PRESET_TEMPLATES)[number]) => {
    importTemplate({
      ...preset,
      id: "",
      createdAt: "",
      updatedAt: "",
    });
    setShowPresets(false);
  };

  return (
    <div className="flex w-56 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3">
        <h2 className="mb-2 text-sm font-medium">Templates</h2>
        <div className="flex gap-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New template..."
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button size="icon" onClick={handleCreate} disabled={!newName.trim()}>
            <Plus className="size-4" />
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full"
          onClick={() => setShowPresets(!showPresets)}
        >
          <Sparkles className="size-4" />
          {showPresets ? "Hide Presets" : "Load Preset"}
        </Button>
        {showPresets && (
          <div className="mt-2 space-y-1">
            {PRESET_TEMPLATES.map((preset, i) => (
              <button
                key={i}
                onClick={() => handleLoadPreset(preset)}
                className="w-full rounded bg-muted p-2 text-left text-xs transition-colors hover:bg-muted/80"
              >
                <p className="font-medium">{preset.name}</p>
                <p className="text-muted-foreground">{preset.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {templates.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No templates yet</p>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className={`group flex cursor-pointer items-center gap-2 rounded p-2 transition-colors ${
                currentTemplateId === template.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => setCurrentTemplate(template.id)}
            >
              <FileImage className="size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{template.name}</p>
                <p className="text-xs text-muted-foreground">{template.elements.length} elements</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateTemplate(template.id);
                  }}
                  title="Duplicate"
                >
                  <Copy className="size-3" />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTemplate(template.id);
                  }}
                  title="Delete"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
