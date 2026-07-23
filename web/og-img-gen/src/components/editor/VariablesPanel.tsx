import { Plus, Trash2, Variable } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "@/stores/editor-store";

export function VariablesPanel() {
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDefault, setNewDefault] = useState("");

  const currentTemplateId = useEditorStore((s) => s.currentTemplateId);
  const templates = useEditorStore((s) => s.templates);
  const variableValues = useEditorStore((s) => s.variableValues);
  const addVariable = useEditorStore((s) => s.addVariable);
  const removeVariable = useEditorStore((s) => s.removeVariable);
  const setVariableValue = useEditorStore((s) => s.setVariableValue);

  const template = templates.find((t) => t.id === currentTemplateId);

  if (!template) {
    return null;
  }

  const handleAdd = () => {
    if (!newKey.trim()) {
      return;
    }
    addVariable({
      key: newKey.trim(),
      label: newLabel.trim() || newKey.trim(),
      defaultValue: newDefault,
    });
    setNewKey("");
    setNewLabel("");
    setNewDefault("");
  };

  return (
    <div className="border-t border-border/60">
      <div className="flex items-center gap-2 border-b border-border/60 p-3">
        <Variable className="size-4" />
        <span className="text-sm font-medium">Variables</span>
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto p-3">
        {template.variables.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No variables defined. Add variables to use{" "}
            <code className="rounded bg-muted px-1">{"{{key}}"}</code> in text elements.
          </p>
        ) : (
          template.variables.map((v) => (
            <div key={v.key} className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">{v.label}</Label>
                <Input
                  value={variableValues[v.key] ?? v.defaultValue}
                  onChange={(e) => setVariableValue(v.key, e.target.value)}
                  placeholder={v.defaultValue}
                />
              </div>
              <Button size="icon-sm" variant="ghost" onClick={() => removeVariable(v.key)}>
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))
        )}

        {/* Add new variable */}
        <div className="space-y-2 border-t border-border/60 pt-2">
          <p className="text-xs font-medium">Add Variable</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Key</Label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="title"
              />
            </div>
            <div>
              <Label className="text-xs">Label</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Title"
              />
            </div>
            <div>
              <Label className="text-xs">Default</Label>
              <Input
                value={newDefault}
                onChange={(e) => setNewDefault(e.target.value)}
                placeholder="My Title"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!newKey.trim()}>
            <Plus className="size-4" />
            Add Variable
          </Button>
        </div>
      </div>
    </div>
  );
}
