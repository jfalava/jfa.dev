import { DndContext, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { useRef, useCallback, useMemo } from "react";

import { useEditorStore } from "@/stores/editor-store";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/types/editor";

import { ElementRenderer } from "./ElementRenderer";

interface DraggableElementProps {
  id: string;
  children: React.ReactNode;
}

function DraggableElement({ id, children }: DraggableElementProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const selectedElementId = useEditorStore((s) => s.selectedElementId);
  const selectElement = useEditorStore((s) => s.selectElement);

  const style: React.CSSProperties = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: isDragging ? 1000 : undefined,
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        selectElement(id);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        selectElement(id);
      }}
      className={`absolute cursor-move ${selectedElementId === id ? "ring-primary ring-2 ring-offset-1 ring-offset-background" : ""}`}
    >
      {children}
    </div>
  );
}

function GridOverlay({ gridSize }: { gridSize: number }) {
  const lines = useMemo(() => {
    const verticalLines: number[] = [];
    const horizontalLines: number[] = [];

    for (let x = gridSize; x < CANVAS_WIDTH; x += gridSize) {
      verticalLines.push(x);
    }
    for (let y = gridSize; y < CANVAS_HEIGHT; y += gridSize) {
      horizontalLines.push(y);
    }

    return { verticalLines, horizontalLines };
  }, [gridSize]);

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{ zIndex: 1 }}
    >
      {lines.verticalLines.map((x) => (
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={CANVAS_HEIGHT}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
      ))}
      {lines.horizontalLines.map((y) => (
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={CANVAS_WIDTH}
          y2={y}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const currentTemplateId = useEditorStore((s) => s.currentTemplateId);
  const templates = useEditorStore((s) => s.templates);
  const zoom = useEditorStore((s) => s.zoom);
  const gridSize = useEditorStore((s) => s.gridSize);
  const showGrid = useEditorStore((s) => s.showGrid);
  const moveElement = useEditorStore((s) => s.moveElement);
  const selectElement = useEditorStore((s) => s.selectElement);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);

  const template = templates.find((t) => t.id === currentTemplateId);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      if (!template) {
        return;
      }

      const element = template.elements.find((el) => el.id === active.id);
      if (!element || element.locked) {
        return;
      }

      const rawX = element.position.x + delta.x / zoom;
      const rawY = element.position.y + delta.y / zoom;

      const snappedX = snapToGrid(rawX);
      const snappedY = snapToGrid(rawY);

      const newX = Math.max(0, Math.min(CANVAS_WIDTH - element.size.width, snappedX));
      const newY = Math.max(0, Math.min(CANVAS_HEIGHT - element.size.height, snappedY));

      moveElement(element.id, { x: newX, y: newY });
    },
    [template, zoom, moveElement, snapToGrid],
  );

  if (!template) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Select or create a template to start editing</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 lg:p-8">
      <div className="flex min-h-full items-center justify-center">
        <DndContext onDragEnd={handleDragEnd}>
          <div
            ref={canvasRef}
            data-og-canvas
            tabIndex={0}
            onClick={() => selectElement(null)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") {
                return;
              }
              e.preventDefault();
              selectElement(null);
            }}
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              background: template.canvasBackground,
              transform: `scale(${zoom})`,
              transformOrigin: "center",
            }}
            className="relative rounded-md border bg-card shadow-sm"
          >
            {showGrid && <GridOverlay gridSize={gridSize} />}
            {template.elements
              .filter((el) => el.visible)
              .map((element) => (
                <DraggableElement key={element.id} id={element.id}>
                  <div
                    style={{
                      position: "absolute",
                      left: element.position.x,
                      top: element.position.y,
                      width: element.size.width,
                      height: element.size.height,
                    }}
                  >
                    <ElementRenderer element={element} />
                  </div>
                </DraggableElement>
              ))}
          </div>
        </DndContext>
      </div>
    </div>
  );
}
