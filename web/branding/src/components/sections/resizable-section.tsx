import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@jfa.dev/common/ui";

import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function ResizableSection() {
  return (
    <Section
      id="resizable"
      title="Resizable"
      description="Bounded editor panels. Drag a divider, or focus it and use the arrow keys to resize. Minimum sizes protect the content."
    >
      <Specimen label="Horizontal panels with a nested vertical split">
        <div className="h-64 max-w-3xl border border-border">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel defaultSize="35%" minSize="25%">
              <div className="p-4 type-ui">Layers</div>
            </ResizablePanel>
            <ResizableHandle withHandle aria-label="Resize layers" />
            <ResizablePanel defaultSize="65%" minSize="40%">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel defaultSize="60%" minSize="30%">
                  <div className="p-4 type-ui">Canvas</div>
                </ResizablePanel>
                <ResizableHandle withHandle aria-label="Resize canvas" />
                <ResizablePanel defaultSize="40%" minSize="25%">
                  <div className="p-4 type-ui">Properties</div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </Specimen>
    </Section>
  );
}
