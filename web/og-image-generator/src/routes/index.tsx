import { createFileRoute } from "@tanstack/react-router";

import {
  Canvas,
  Toolbar,
  TemplatesSidebar,
  PropertiesPanel,
  VariablesPanel,
  CanvasSettings,
  FontManager,
} from "@/components/editor";

export const Route = createFileRoute("/")({ component: EditorPage });

function EditorPage() {
  return (
    <div data-editor-shell className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col">
      <Toolbar />
      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <aside
          className="min-h-0 overflow-hidden rounded-lg border bg-card text-card-foreground"
          aria-label="Template settings"
        >
          <TemplatesSidebar />
          <CanvasSettings />
          <VariablesPanel />
          <FontManager />
        </aside>

        <section
          className="min-h-0 overflow-hidden rounded-lg border bg-muted/20"
          aria-label="Canvas"
        >
          <Canvas />
        </section>

        <aside className="min-h-0 flex" aria-label="Element properties">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
}
