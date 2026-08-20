import type { Canvas, FabricObject } from "fabric";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import {
  isImageLayer,
  isGeometryLayer,
  isTextLayer,
  type Layer,
  type LayerPatch,
  type OgProject,
} from "@/editor/model";

export interface EditorCanvasHandle {
  download: () => Promise<Blob | null>;
  selectLayer: (layerId: string | null) => void;
}

interface EditorCanvasProps {
  project: OgProject;
  assetUrls: ReadonlyMap<string, string>;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onChangeLayer: (layerId: string, patch: LayerPatch) => void;
}

interface FabricTextObject extends FabricObject {
  text: string;
}

function isTextObject(object: FabricObject): object is FabricTextObject {
  return "text" in object;
}

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(function EditorCanvas(
  { assetUrls, onChangeLayer, onSelectLayer, project, selectedLayerId },
  ref,
) {
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const layerMapRef = useRef(new Map<FabricObject, string>());
  const projectRef = useRef(project);
  const onChangeLayerRef = useRef(onChangeLayer);
  const onSelectLayerRef = useRef(onSelectLayer);
  const syncingRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    projectRef.current = project;
    onChangeLayerRef.current = onChangeLayer;
    onSelectLayerRef.current = onSelectLayer;
  }, [onChangeLayer, onSelectLayer, project]);

  useEffect(() => {
    let disposed = false;
    let canvas: Canvas | null = null;
    const layerMap = layerMapRef.current;

    async function initializeCanvas(): Promise<void> {
      const canvasElement = canvasElementRef.current;
      if (canvasElement === null) {
        return;
      }

      const fabric = await import("fabric");
      if (disposed) {
        return;
      }

      canvas = new fabric.Canvas(canvasElement, {
        height: projectRef.current.height,
        preserveObjectStacking: true,
        renderOnAddRemove: false,
        selection: true,
        width: projectRef.current.width,
      });
      canvasRef.current = canvas;

      const publishSelection = (): void => {
        if (syncingRef.current) {
          return;
        }
        const activeObject = canvas?.getActiveObject();
        onSelectLayerRef.current(
          activeObject === undefined || activeObject === null
            ? null
            : (layerMapRef.current.get(activeObject) ?? null),
        );
      };

      canvas.on("selection:created", publishSelection);
      canvas.on("selection:updated", publishSelection);
      canvas.on("selection:cleared", publishSelection);
      canvas.on("object:modified", (event) => {
        if (syncingRef.current || event.target === undefined) {
          return;
        }
        publishObjectChange(event.target);
      });
      canvas.on("text:changed", (event) => {
        if (syncingRef.current || event.target === undefined) {
          return;
        }
        if (isTextObject(event.target)) {
          const layerId = layerMapRef.current.get(event.target);
          if (layerId !== undefined) {
            onChangeLayerRef.current(layerId, { text: event.target.text });
          }
        }
      });

      setReady(true);
    }

    function publishObjectChange(object: FabricObject): void {
      const layerId = layerMapRef.current.get(object);
      if (layerId === undefined) {
        return;
      }

      onChangeLayerRef.current(layerId, {
        height: Math.max(1, object.getScaledHeight()),
        rotation: object.angle ?? 0,
        width: Math.max(1, object.getScaledWidth()),
        x: object.left ?? 0,
        y: object.top ?? 0,
      });
    }

    void initializeCanvas();

    return () => {
      disposed = true;
      layerMap.clear();
      if (canvas !== null) {
        void canvas.dispose();
      }
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || !ready) {
      return undefined;
    }
    const currentCanvas = canvas;
    const layerMap = layerMapRef.current;

    let cancelled = false;

    async function syncCanvas(): Promise<void> {
      const fabric = await import("fabric");
      if (cancelled) {
        return;
      }

      syncingRef.current = true;
      currentCanvas.clear();
      layerMap.clear();
      currentCanvas.setDimensions({ height: project.height, width: project.width });
      currentCanvas.backgroundColor = project.background;

      for (const layer of project.layers) {
        if (cancelled || !layer.visible) {
          continue;
        }

        const object = await createFabricObject(fabric, layer, assetUrls);
        if (cancelled || object === null) {
          continue;
        }

        currentCanvas.add(object);
        layerMap.set(object, layer.id);
      }

      currentCanvas.renderAll();
      syncingRef.current = false;

      if (selectedLayerId !== null) {
        const selectedObject = [...layerMap.entries()].find(
          ([, layerId]) => layerId === selectedLayerId,
        )?.[0];
        if (selectedObject !== undefined && selectedObject.selectable) {
          currentCanvas.setActiveObject(selectedObject);
          currentCanvas.renderAll();
        }
      }
    }

    void syncCanvas();

    return () => {
      cancelled = true;
      syncingRef.current = false;
    };
  }, [assetUrls, project, ready, selectedLayerId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || !ready) {
      return;
    }

    const selectedObject = [...layerMapRef.current.entries()].find(
      ([, layerId]) => layerId === selectedLayerId,
    )?.[0];

    syncingRef.current = true;
    if (selectedObject === undefined || !selectedObject.selectable) {
      canvas.discardActiveObject();
    } else {
      canvas.setActiveObject(selectedObject);
    }
    canvas.renderAll();
    syncingRef.current = false;
  }, [ready, selectedLayerId]);

  useImperativeHandle(
    ref,
    () => ({
      download: async () => {
        const canvas = canvasRef.current;
        if (canvas === null) {
          return null;
        }

        const activeObject = canvas.getActiveObject();
        syncingRef.current = true;
        canvas.discardActiveObject();
        canvas.renderAll();
        const blob = await canvas.toBlob({
          enableRetinaScaling: false,
          format: "png",
          multiplier: 1,
        });
        if (activeObject !== undefined && activeObject !== null) {
          canvas.setActiveObject(activeObject);
          canvas.renderAll();
        }
        syncingRef.current = false;
        return blob;
      },
      selectLayer: (layerId) => {
        const canvas = canvasRef.current;
        if (canvas === null) {
          return;
        }
        const selectedObject = [...layerMapRef.current.entries()].find(
          ([, currentLayerId]) => currentLayerId === layerId,
        )?.[0];
        if (selectedObject === undefined || !selectedObject.selectable) {
          canvas.discardActiveObject();
        } else {
          canvas.setActiveObject(selectedObject);
        }
        canvas.requestRenderAll();
      },
    }),
    [],
  );

  return <canvas ref={canvasElementRef} aria-label="OpenGraph image canvas" />;
});

async function createFabricObject(
  fabric: typeof import("fabric"),
  layer: Layer,
  assetUrls: ReadonlyMap<string, string>,
): Promise<FabricObject | null> {
  const baseOptions = {
    angle: layer.rotation,
    evented: !layer.locked,
    left: layer.x,
    opacity: layer.opacity,
    originX: "left" as const,
    originY: "top" as const,
    selectable: !layer.locked,
  };

  if (isTextLayer(layer)) {
    return new fabric.Textbox(layer.text, {
      ...baseOptions,
      fill: layer.fill,
      fontFamily: layer.fontFamily,
      fontSize: layer.fontSize,
      fontWeight: layer.fontWeight,
      textAlign: layer.textAlign,
      width: layer.width,
      top: layer.y,
    });
  }

  if (isGeometryLayer(layer)) {
    if (layer.geometry === "circle") {
      return new fabric.Ellipse({
        ...baseOptions,
        fill: layer.fill,
        rx: layer.width / 2,
        ry: layer.height / 2,
        top: layer.y,
      });
    }

    return new fabric.Rect({
      ...baseOptions,
      fill: layer.fill,
      height: layer.height,
      rx: layer.cornerRadius,
      ry: layer.cornerRadius,
      top: layer.y,
      width: layer.width,
    });
  }

  if (isImageLayer(layer)) {
    const assetUrl = assetUrls.get(layer.assetId);
    if (assetUrl === undefined) {
      return null;
    }

    const image = await fabric.FabricImage.fromURL(assetUrl, { crossOrigin: "anonymous" });
    const imageWidth = image.width ?? layer.width;
    const imageHeight = image.height ?? layer.height;
    const scale =
      layer.fit === "cover"
        ? Math.max(layer.width / imageWidth, layer.height / imageHeight)
        : Math.min(layer.width / imageWidth, layer.height / imageHeight);
    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;

    image.set({
      ...baseOptions,
      left: layer.x + (layer.width - scaledWidth) / 2,
      top: layer.y + (layer.height - scaledHeight) / 2,
    });
    image.scale(scale);
    return image;
  }

  return null;
}
