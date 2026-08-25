import { Button, Input } from "@jfa.dev/common/ui";
import { Frame, Plus, Save, X } from "lucide-react";
import { useState } from "react";

import { PreviewShell } from "./preview-shell";

const presets = [
  { id: "og", label: "OG Banner", sub: "1200×630", w: 1200, h: 630, hint: "Facebook / LinkedIn" },
  { id: "x", label: "X Card", sub: "1200×675", w: 1200, h: 675, hint: "X / Twitter" },
  { id: "yt", label: "YouTube", sub: "1280×720", w: 1280, h: 720, hint: "16:9 thumbnail" },
  { id: "sq", label: "Square", sub: "1080×1080", w: 1080, h: 1080, hint: "Instagram" },
  { id: "story", label: "Story", sub: "1080×1920", w: 1080, h: 1920, hint: "9:16 stories" },
  { id: "wide", label: "Wide", sub: "1600×900", w: 1600, h: 900, hint: "16:9 banner" },
] as const;

function findPresetBySize(w: string, h: string) {
  const nw = Number.parseInt(w, 10);
  const nh = Number.parseInt(h, 10);
  if (Number.isNaN(nw) || Number.isNaN(nh)) {
    return null;
  }
  return presets.find((p) => p.w === nw && p.h === nh) ?? null;
}

export function CanvasPreview() {
  const [selectedId, setSelectedId] = useState<string>("og");
  const [width, setWidth] = useState("1200");
  const [height, setHeight] = useState("630");

  const isCustom = selectedId === "custom";
  const displaySize = `${width || "—"}×${height || "—"}`;

  const handlePresetClick = (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset) {
      return;
    }
    setSelectedId(preset.id);
    setWidth(String(preset.w));
    setHeight(String(preset.h));
  };

  const handleWidthChange = (next: string) => {
    // allow empty + digits only (stub — no wiring)
    if (next !== "" && !/^\d*$/.test(next)) {
      return;
    }
    const nextH = height;
    const match = findPresetBySize(next, nextH);
    setWidth(next);
    setSelectedId(match ? match.id : "custom");
  };

  const handleHeightChange = (next: string) => {
    if (next !== "" && !/^\d*$/.test(next)) {
      return;
    }
    const nextW = width;
    const match = findPresetBySize(nextW, next);
    setHeight(next);
    setSelectedId(match ? match.id : "custom");
  };

  return (
    <PreviewShell
      label="Canvas — presets"
      caption="Pick a preset or type a custom size (100–8000 px). The background fills the new size automatically. This is the same control you see in the editor’s Properties → Canvas."
    >
      <div className="p-4">
        <details
          open
          className="group/canvas border-b border-border py-4 first:pt-0 last:border-b-0"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-medium select-none marker:hidden [&::-webkit-details-marker]:hidden">
            <Frame className="size-3.5 text-primary" />
            Canvas
            <span className="ml-auto flex items-center gap-2 text-[10px] font-normal text-muted-foreground">
              {displaySize}
              <span className="text-[11px]">▾</span>
            </span>
          </summary>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => {
                const isSelected = selectedId === p.id;
                return (
                  <button
                    key={p.id}
                    aria-pressed={isSelected}
                    onClick={() => handlePresetClick(p.id)}
                    type="button"
                    className={`rounded-md border px-2 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:outline-none ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/20 text-foreground hover:border-border/80 hover:bg-muted/40"
                    }`}
                  >
                    <span className="block text-xs leading-none font-medium">{p.label}</span>
                    <span className="block text-[10px] leading-none text-muted-foreground">
                      {p.sub}
                    </span>
                    <span className="block truncate text-[9px] leading-none text-muted-foreground/70">
                      {p.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              className={`rounded-md border p-2 transition-colors ${isCustom ? "border-primary/20 bg-primary/[0.04]" : "border-border bg-muted/20"}`}
            >
              <p className="mb-2 text-[10px] font-medium text-muted-foreground">
                Custom{" "}
                {isCustom ? (
                  <span className="text-primary">• active</span>
                ) : (
                  <span className="text-muted-foreground/60">• preset</span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[10px] leading-none">
                  <span className="font-medium text-muted-foreground">W</span>
                  <input
                    aria-label="Custom canvas width"
                    className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-right text-xs focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                    inputMode="numeric"
                    onChange={(e) => handleWidthChange(e.target.value)}
                    placeholder="1200"
                    value={width}
                  />
                </label>
                <label className="flex flex-col gap-1 text-[10px] leading-none">
                  <span className="font-medium text-muted-foreground">H</span>
                  <input
                    aria-label="Custom canvas height"
                    className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-right text-xs focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                    inputMode="numeric"
                    onChange={(e) => handleHeightChange(e.target.value)}
                    placeholder="630"
                    value={height}
                  />
                </label>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
                Any size from 100 to 8000 px. Background fills automatically.
              </p>
            </div>
          </div>
        </details>
      </div>
    </PreviewShell>
  );
}

export function TabsPreview() {
  const [tabs, setTabs] = useState([
    { id: "1", name: "Untitled canvas" },
    { id: "2", name: "Untitled canvas 2" },
    { id: "3", name: "Untitled canvas 3" },
  ]);
  const [activeTabId, setActiveTabId] = useState("3");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditingName(name);
  }

  function commitEdit() {
    if (editingId !== null) {
      const trimmed = editingName.trim();
      if (trimmed.length > 0) {
        setTabs((prev) => prev.map((t) => (t.id === editingId ? { ...t, name: trimmed } : t)));
      }
    }
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function switchTab(id: string) {
    setActiveTabId(id);
  }

  function createTab() {
    // stub: mimic getTabDisplayName — "Untitled canvas" then "Untitled canvas 2", etc.
    const nextIndex = tabs.length;
    const name = nextIndex === 0 ? "Untitled canvas" : `Untitled canvas ${nextIndex + 1}`;
    const id = `tab-${Date.now()}`;
    setTabs((prev) => [...prev, { id, name }]);
    setActiveTabId(id);
  }

  function closeTab(id: string) {
    setTabs((prev) => {
      if (prev.length <= 1) {
        const fresh = [{ id: `tab-${Date.now()}`, name: "Untitled canvas" }];
        setActiveTabId(fresh[0].id);
        return fresh;
      }
      const closingIndex = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        const nextIndex = Math.min(closingIndex, next.length - 1);
        const nextActive = next[nextIndex];
        if (nextActive) {
          setActiveTabId(nextActive.id);
        }
      }
      if (editingId === id) {
        setEditingId(null);
      }
      return next;
    });
  }

  return (
    <PreviewShell
      label="Tabs"
      caption="Each tab is a separate canvas with its own layers, size, and history. Tabs live above the canvas."
    >
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-background px-2 text-[11px]">
        <Save className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 scrollbar-thin items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isEditing = editingId === tab.id;
            return (
              <div
                key={tab.id}
                className={`group flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 transition-colors ${
                  isActive
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {isEditing ? (
                  <Input
                    aria-label={`Rename ${tab.name}`}
                    // oxlint-disable-next-line jsx-a11y/no-autofocus -- stub rename: focus is intentional for double-click edit
                    autoFocus
                    className="h-5 w-32 border-0 bg-transparent px-1 text-[11px] shadow-none"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitEdit();
                      }
                      if (event.key === "Escape") {
                        cancelEdit();
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="max-w-28 truncate text-left text-[11px] font-medium focus-visible:outline-none"
                    onClick={() => switchTab(tab.id)}
                    onDoubleClick={() => startEdit(tab.id, tab.name)}
                    title={`${tab.name} — double-click to rename`}
                  >
                    {tab.name}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Close ${tab.name}`}
                  className="rounded p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none dark:hover:bg-white/10"
                  onClick={() => closeTab(tab.id)}
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
          <Button
            aria-label="New canvas"
            onPress={createTab}
            size="icon-sm"
            variant="ghost"
            className="size-6 shrink-0"
          >
            <Plus className="size-3" />
          </Button>
        </div>
        <span
          className="hidden max-w-40 truncate text-[10px] text-muted-foreground sm:block"
          title="Saved locally in this browser"
        >
          Saved locally in this browser
        </span>
      </div>
    </PreviewShell>
  );
}
