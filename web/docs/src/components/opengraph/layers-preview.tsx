import { Button, ColorPicker, Input } from "@jfa.dev/common/ui";
import { Eye, EyeOff, LockKeyhole, Search, Square, Type, Unlock } from "lucide-react";
import { useRef, useState } from "react";

import { PreviewShell } from "./preview-shell";

type MockLayer = {
  id: string;
  name: string;
  type: "text" | "shape";
  visible: boolean;
  locked: boolean;
};

const initialLayers: MockLayer[] = [
  { id: "1", name: "New text", type: "text", visible: true, locked: false },
  { id: "2", name: "Supporting copy", type: "text", visible: true, locked: false },
  { id: "3", name: "Headline", type: "text", visible: true, locked: false },
  { id: "4", name: "Accent block", type: "shape", visible: true, locked: false },
  { id: "5", name: "Background", type: "shape", visible: true, locked: true },
];

export function LayersPreview() {
  const [layers, setLayers] = useState<MockLayer[]>(initialLayers);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string>("3");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const draggedId = useRef<string | null>(null);

  const visibleLayers = layers.filter((l) => l.name.toLowerCase().includes(filter.toLowerCase()));

  function toggleVisibility(id: string) {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  }

  function toggleLocked(id: string) {
    // Background stays locked in the real editor — stub keeps it locked
    if (id === "5") {
      return;
    }
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)));
  }

  function startRename(layer: MockLayer) {
    if (layer.locked) {
      return;
    }
    setEditingId(layer.id);
    setEditingName(layer.name);
    setSelectedId(layer.id);
  }

  function commitRename() {
    if (editingId !== null) {
      const trimmed = editingName.trim();
      if (trimmed.length > 0) {
        setLayers((prev) => prev.map((l) => (l.id === editingId ? { ...l, name: trimmed } : l)));
      }
    }
    setEditingId(null);
  }

  function cancelRename() {
    setEditingId(null);
  }

  function moveLayerBefore(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }
    setLayers((prev) => {
      const sourceIndex = prev.findIndex((l) => l.id === sourceId);
      const targetIndex = prev.findIndex((l) => l.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }
      const next = [...prev];
      const [source] = next.splice(sourceIndex, 1);
      if (!source) {
        return prev;
      }
      const insertAt = next.findIndex((l) => l.id === targetId);
      next.splice(insertAt, 0, source);
      return next;
    });
  }

  return (
    <PreviewShell
      label="Layers — live panel"
      caption="Search, reorder by dragging, toggle visibility/lock, double-click to rename. The + and ⋯ menus are the same dropdowns as in the editor."
    >
      <div className="mx-auto max-w-sm border bg-background">
        <div className="flex h-10 items-center justify-between border-b px-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="size-3.5 text-primary">▦</span> Layers
          </div>
          <div className="flex gap-0.5">
            <Button aria-label="Add layer" size="icon-sm" variant="ghost" className="size-6">
              +
            </Button>
            <Button aria-label="Layer options" size="icon-sm" variant="ghost" className="size-6">
              ⋯
            </Button>
          </div>
        </div>
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search layers"
              className="pl-7"
              placeholder="Search layers"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
        </div>
        <div className="p-2">
          {visibleLayers.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No matching layers
            </p>
          ) : (
            visibleLayers.map((l) => {
              const Icon = l.type === "text" ? Type : Square;
              const isSelected = selectedId === l.id;
              const isEditing = editingId === l.id;
              return (
                <div
                  key={l.id}
                  draggable={!l.locked && !isEditing}
                  onDragStart={() => {
                    draggedId.current = l.id;
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedId.current !== null) {
                      moveLayerBefore(draggedId.current, l.id);
                      draggedId.current = null;
                    }
                  }}
                  className={`flex items-center gap-1 rounded-md px-1 py-1 text-xs ${isSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"} ${l.visible ? "" : "opacity-50"}`}
                >
                  {isEditing ? (
                    <div className="flex min-w-0 flex-1 items-center gap-1 px-1.5">
                      <Icon className="size-3.5 shrink-0" />
                      <Input
                        aria-label={`Rename ${l.name}`}
                        // oxlint-disable-next-line jsx-a11y/no-autofocus -- stub inline rename: focus is intentional for double-click edit
                        autoFocus
                        className="h-6 flex-1"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            commitRename();
                          }
                          if (event.key === "Escape") {
                            cancelRename();
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Select ${l.name}`}
                      className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 text-left focus-visible:outline-none"
                      onClick={() => setSelectedId(l.id)}
                      onDoubleClick={() => startRename(l)}
                      title={`${l.name} — double-click to rename`}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span className="truncate">{l.name}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {l.type === "text" ? "Text" : "Shape"}
                      </span>
                    </button>
                  )}
                  <Button
                    aria-label={l.visible ? `Hide ${l.name}` : `Show ${l.name}`}
                    size="icon-sm"
                    variant="ghost"
                    onPress={() => toggleVisibility(l.id)}
                  >
                    {l.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </Button>
                  <Button
                    aria-label={l.locked ? `Unlock ${l.name}` : `Lock ${l.name}`}
                    size="icon-sm"
                    variant="ghost"
                    isDisabled={l.id === "5"}
                    onPress={() => toggleLocked(l.id)}
                  >
                    {l.locked ? (
                      <LockKeyhole className="size-3.5" />
                    ) : (
                      <Unlock className="size-3.5" />
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2 text-[10px] text-muted-foreground">
          <span>{layers.length} layers</span>
          <span>1200 × 630</span>
        </div>
      </div>
    </PreviewShell>
  );
}

export function ColorPickerPreview() {
  // stub-local: uses real ColorPicker so the swatch/picker actually change color, but nothing is wired
  const [color, setColor] = useState("#E91AE7");

  return (
    <PreviewShell
      label="Color picker"
      caption="Click any swatch to open the picker. The same picker appears in the toolbox and in Properties. Drag the field or type a hex."
    >
      <div className="flex flex-col gap-3 p-4">
        {/* Compact field as used in Properties → Fill (real ColorField) */}
        <div className="flex flex-col gap-1 text-[10px]">
          <span className="font-medium text-muted-foreground">Color</span>
          <div className="flex items-center gap-2 rounded-md border bg-input/20 px-2 py-1.5">
            <ColorPicker
              compact
              color={color}
              onChange={setColor}
              ariaLabel="Color"
              className="!size-7 !p-0.5"
            />
            <Input
              aria-label="Color hex"
              className="h-7 flex-1 bg-transparent px-0 text-right font-mono text-xs shadow-none"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="#E91AE7"
            />
          </div>
        </div>
        {/* Full picker preview — standalone demo of the same ColorPicker component */}
        <div className="mx-auto w-56 rounded-xl border bg-popover p-3 shadow-lg">
          <ColorPicker color={color} onChange={setColor} ariaLabel="Color picker demo" />
          <div className="mt-3 flex items-center gap-2">
            <Input
              aria-label="Picker hex"
              className="h-8 w-24 font-mono text-xs"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="#E91AE7"
            />
            <span className="font-mono text-[10px] text-muted-foreground">live stub — no save</span>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
