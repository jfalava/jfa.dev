import type { EditorCanvasHandle } from "@/components/editor-canvas";

export const editorCanvasRef = {
  // SAFETY: canvas handle is null until EditorCanvas mounts and is set via editorCanvasRef effect in EditorPage
  current: null as EditorCanvasHandle | null,
};
