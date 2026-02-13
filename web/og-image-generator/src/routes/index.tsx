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
    <div className="flex h-[calc(100vh-48px)] flex-col">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Templates + Settings */}
        <div className="flex flex-col">
          <TemplatesSidebar />
          <CanvasSettings />
          <VariablesPanel />
          <FontManager />
        </div>

        {/* Canvas area */}
        <Canvas />

        {/* Right sidebar - Properties */}
        <PropertiesPanel />
      </div>
    </div>
  );
}
