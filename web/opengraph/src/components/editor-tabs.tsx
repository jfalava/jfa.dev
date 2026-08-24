import { Button, Input } from "@jfa.dev/common/ui";
import { Plus, Save, X } from "lucide-react";
import { useState } from "react";

import { useEditorStore } from "@/editor/store";

export function EditorTabsBar() {
  const tabs = useEditorStore((state) => state.tabs);
  const activeTabId = useEditorStore((state) => state.activeTabId);
  const notice = useEditorStore((state) => state.notice);
  const switchTab = useEditorStore((state) => state.switchTab);
  const createTab = useEditorStore((state) => state.createTab);
  const closeTab = useEditorStore((state) => state.closeTab);
  const updateProjectName = useEditorStore((state) => state.updateProjectName);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function startEdit(id: string, name: string): void {
    setEditingId(id);
    setEditingName(name);
  }

  function commitEdit(): void {
    if (editingId !== null) {
      const trimmed = editingName.trim();
      if (trimmed.length > 0) {
        // Only allow rename of active tab for now — switch first if needed
        if (editingId !== activeTabId) {
          switchTab(editingId);
          // Defer rename to next tick after switch
          setTimeout(() => updateProjectName(trimmed), 0);
        } else {
          updateProjectName(trimmed);
        }
      }
    }
    setEditingId(null);
  }

  function cancelEdit(): void {
    setEditingId(null);
  }

  return (
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
                  aria-label={`Rename ${tab.project.name}`}
                  // oxlint-disable-next-line jsx-a11y/no-autofocus -- Krita-style inline rename: focus is intentional for double-click edit
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
                  onDoubleClick={() => startEdit(tab.id, tab.project.name)}
                  title={`${tab.project.name} — double-click to rename`}
                >
                  {tab.project.name}
                </button>
              )}
              <button
                type="button"
                aria-label={`Close ${tab.project.name}`}
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
        title={notice}
      >
        {notice}
      </span>
    </div>
  );
}
