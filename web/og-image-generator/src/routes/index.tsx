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
    <div data-editor-shell className="editor-shell">
      <Toolbar />
      <div className="editor-workbench">
        <aside className="editor-left-rail" aria-label="Template settings">
          <TemplatesSidebar />
          <CanvasSettings />
          <VariablesPanel />
          <FontManager />
        </aside>

        <section className="editor-stage" aria-label="Canvas">
          <Canvas />
        </section>

        <aside className="editor-right-rail" aria-label="Element properties">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
}
