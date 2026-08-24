/* oxlint-disable react-hooks/exhaustive-deps */
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Input,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@jfa.dev/common/ui";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FileType,
  Frame,
  Hand,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  MoreHorizontal,
  MousePointer2,
  Palette,
  Pencil,
  Pipette,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Square,
  Trash2,
  Type,
  Undo2,
  Unlock,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Pressable } from "react-aria-components";

import { EditorCanvas, type EditorCanvasHandle } from "@/components/editor-canvas";
import { ShortcutGuide } from "@/components/shortcut-guide";
import { editorCanvasRef } from "@/editor/canvas-ref";
import { projectInputRef } from "@/editor/project-input-ref";
import { registerFontFile, registerStoredFont } from "@/editor/fonts";
import { usePhotoshopHotkeys } from "@/hooks/use-photoshop-hotkeys";
import {
  createInitialProject,
  type FontMeta,
  isImageLayer,
  isGeometryLayer,
  isTextLayer,
  type Layer,
  type LayerPatch,
  type OgProject,
} from "@/editor/model";
import {
  createFontMeta,
  deleteUnusedAssets,
  deleteUnusedFonts,
  FONT_FILE_ACCEPT,
  IMAGE_FILE_ACCEPT,
  isSupportedFontFile,
  isSupportedImageFile,
  loadAssetUrl,
  loadFont as loadStoredFont,
  loadProject,
  saveFontAsset,
  saveImageAsset,
  saveProject,
  type FontUploadOptions,
} from "@/editor/storage";
import { useEditorStore } from "@/editor/store";

export const Route = createFileRoute("/")({ component: EditorPage });

async function registerProjectFonts(fonts: readonly FontMeta[]): Promise<number> {
  let failedCount = 0;
  for (const font of fonts) {
    try {
      const storedFont = await loadStoredFont(font.id);
      if (storedFont === null) {
        failedCount += 1;
      } else {
        await registerStoredFont(storedFont);
      }
    } catch {
      failedCount += 1;
    }
  }
  return failedCount;
}

function getLayerFill(layer: Layer | undefined): string | undefined {
  if (layer === undefined) {
    return undefined;
  }
  if (isTextLayer(layer) || isGeometryLayer(layer)) {
    return layer.fill;
  }
  return undefined;
}

function EditorPage() {
  const project = useEditorStore((state) => state.project);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const hydrated = useEditorStore((state) => state.hydrated);
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const updateLayer = useEditorStore((state) => state.updateLayer);
  const addTextLayer = useEditorStore((state) => state.addTextLayer);
  const addGeometryLayer = useEditorStore((state) => state.addGeometryLayer);
  const addImageLayer = useEditorStore((state) => state.addImageLayer);
  const addFont = useEditorStore((state) => state.addFont);
  const updateProjectName = useEditorStore((state) => state.updateProjectName);
  const duplicateSelectedLayer = useEditorStore((state) => state.duplicateSelectedLayer);
  const removeSelectedLayer = useEditorStore((state) => state.removeSelectedLayer);
  const toggleLayerVisibility = useEditorStore((state) => state.toggleLayerVisibility);
  const toggleLayerLocked = useEditorStore((state) => state.toggleLayerLocked);
  const moveLayerBefore = useEditorStore((state) => state.moveLayerBefore);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const pastLength = useEditorStore((state) => state.past.length);
  const futureLength = useEditorStore((state) => state.future.length);

  const canvasRef = useRef<EditorCanvasHandle>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const foregroundColorInputRef = useRef<HTMLInputElement>(null);
  const backgroundColorInputRef = useRef<HTMLInputElement>(null);
  const [assetUrls, setAssetUrls] = useState<ReadonlyMap<string, string>>(new Map());
  const [filter, setFilter] = useState("");
  const [zoom, setZoom] = useState(1);
  const busy = useEditorStore((state) => state.busy);
  const setBusy = useEditorStore((state) => state.setBusy);
  const notice = useEditorStore((state) => state.notice);
  const setNotice = useEditorStore((state) => state.setNotice);
  const isHelpOpen = useEditorStore((state) => state.isHelpOpen);
  const isHelpHeld = useEditorStore((state) => state.isHelpHeld);
  const setHelpOpen = useEditorStore((state) => state.setHelpOpen);
  const setHelpHeld = useEditorStore((state) => state.setHelpHeld);
  const [isImageDropTarget, setIsImageDropTarget] = useState(false);
  const [activeTool, setActiveTool] = useState<"select" | "hand" | "pipette">("select");

  const selectedLayer = project.layers.find(({ id }) => id === selectedLayerId);

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    editorCanvasRef.current = canvasRef.current;
  }, []);

  useEffect(() => {
    // SAFETY: selector targets hidden file input rendered in this page; null is expected before mount
    const el = document.querySelector<HTMLInputElement>('input[accept=".ogproj,application/zip"]');
    projectInputRef.current = el;
  }, []);

  const isHelpVisible = isHelpOpen || isHelpHeld;

  usePhotoshopHotkeys(
    {
      onToolSelect: setActiveTool,
      onAddText: addTextLayer,
      onAddGeometry: addGeometryLayer,
      onAddImage: () => {
        imageInputRef.current?.click();
      },
      onDuplicate: () => {
        if (selectedLayerId) {
          useEditorStore.getState().duplicateLayer(selectedLayerId);
        } else {
          duplicateSelectedLayer();
        }
      },
      onDelete: () => {
        if (selectedLayerId) {
          useEditorStore.getState().removeLayer(selectedLayerId);
        } else {
          removeSelectedLayer();
        }
      },
      onRename: () => {
        useEditorStore.getState().startRenamingSelected();
      },
      onRefresh: () => {
        if (selectedLayerId) {
          useEditorStore.getState().resetLayer(selectedLayerId);
        }
      },
      onUndo: undo,
      onRedo: redo,
      onImport: () => {
        const el = document.querySelector<HTMLInputElement>('input[accept=".ogproj,application/zip"]');
        el?.click();
      },
      onExportZip: () => {
        const proj = useEditorStore.getState().project;
        void (async () => {
          setBusy(true);
          try {
            const { createProjectArchive, archiveFileName, downloadBlob } = await import("@/editor/archive");
            const archive = await createProjectArchive(proj);
            downloadBlob(archive, archiveFileName(proj));
            setNotice("Project archive downloaded");
          } catch {
            setNotice("The project archive could not be created");
          } finally {
            setBusy(false);
          }
        })();
      },
      onExportPng: () => {
        void (async () => {
          setBusy(true);
          try {
            const { downloadBlob } = await import("@/editor/archive");
            const blob = await editorCanvasRef.current?.download();
            if (!blob) {
              throw new Error("Canvas not ready");
            }
            const proj = useEditorStore.getState().project;
            downloadBlob(blob, `${proj.name || "untitled-canvas"}.png`);
            setNotice("PNG downloaded");
          } catch {
            setNotice("The PNG could not be rendered");
          } finally {
            setBusy(false);
          }
        })();
      },
      onNew: () => {
        useEditorStore.getState().resetProject();
      },
      onZoomIn: () => {
        setZoom((v) => Math.min(2, v + 0.1));
      },
      onZoomOut: () => {
        setZoom((v) => Math.max(0.5, v - 0.1));
      },
      onZoomReset: () => {
        setZoom(1);
      },
      onToggleHelp: () => {
        setHelpOpen(!isHelpOpen);
      },
      onHelpHoldChange: setHelpHeld,
    },
    activeTool,
  );

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    async function restoreProject(): Promise<void> {
      try {
        const storedProject = await loadProject();
        const nextProject = storedProject ?? createInitialProject();
        const failedFontCount = await registerProjectFonts(nextProject.fonts);
        if (!cancelled) {
          useEditorStore.getState().hydrate(nextProject);
          if (failedFontCount > 0) {
            setNotice(
              `${failedFontCount} local font${failedFontCount === 1 ? "" : "s"} could not be loaded`,
            );
          }
        }
      } catch {
        if (!cancelled) {
          useEditorStore.getState().hydrate(createInitialProject());
          setNotice("Started a new canvas; the saved project could not be read");
        }
      }
    }

    void restoreProject();

    return () => {
      cancelled = true;
    };
  }, []);

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hydrated) {
      return undefined;
    }

    const saveTimer = window.setTimeout(() => {
      async function persistProject(): Promise<void> {
        try {
          await saveProject(project);
          await deleteUnusedAssets(project);
          await deleteUnusedFonts(project);
          setNotice("Saved locally in this browser");
        } catch {
          setNotice("Could not save locally; your canvas is still in memory");
        }
      }

      void persistProject();
    }, 300);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [hydrated, project]);

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadAssetUrls(): Promise<void> {
      const assets = project.assets;
      const entries = await Promise.all(
        assets.map(async (asset) => {
          const url = await loadAssetUrl(asset.id);
          if (url !== null) {
            objectUrls.push(url);
            return [asset.id, url] as const;
          }
          return null;
        }),
      );
      if (!cancelled) {
        setAssetUrls(
          new Map(entries.filter((entry): entry is readonly [string, string] => entry !== null)),
        );
      }
    }

    void loadAssetUrls().catch(() => {
      if (!cancelled) {
        setNotice("Some local images could not be loaded");
      }
    });

    return () => {
      cancelled = true;
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [project.assets]);

  function updateSelected(patch: LayerPatch): void {
    if (selectedLayer !== undefined) {
      updateLayer(selectedLayer.id, patch);
    }
  }

  async function handleImageFiles(files: readonly File[]): Promise<void> {
    const imageFiles = files.filter(isSupportedImageFile);
    if (imageFiles.length === 0) {
      setNotice("Choose a PNG, JPEG, WebP, GIF, AVIF, or SVG image");
      return;
    }

    setBusy(true);
    let addedCount = 0;
    let failedCount = files.length - imageFiles.length;

    for (const file of imageFiles) {
      try {
        const asset = await saveImageAsset(file);
        addImageLayer(asset);
        addedCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    if (addedCount === 0) {
      setNotice("Those image files could not be read by this browser");
    } else if (failedCount > 0) {
      setNotice(`${addedCount} image${addedCount === 1 ? "" : "s"} added; ${failedCount} skipped`);
    } else {
      setNotice(`${addedCount} image${addedCount === 1 ? "" : "s"} added from this device`);
    }
    setBusy(false);
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    await handleImageFiles(files);
  }

  async function handleFontUpload(file: File, options: FontUploadOptions): Promise<void> {
    setBusy(true);
    try {
      if (!isSupportedFontFile(file)) {
        throw new Error("Unsupported font file");
      }
      const font = createFontMeta(file, options);
      await registerFontFile(font, file);
      await saveFontAsset(file, font);
      addFont(font);
      setNotice(`${font.family} added locally`);
    } catch {
      setNotice("That font could not be loaded by this browser");
      throw new Error("The font could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  function handleImageDragOver(event: DragEvent<HTMLDivElement>): void {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      setIsImageDropTarget(true);
    }
  }

  function handleImageDragLeave(event: DragEvent<HTMLDivElement>): void {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Element) || !event.currentTarget.contains(relatedTarget)) {
      setIsImageDropTarget(false);
    }
  }

  function handleImageDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsImageDropTarget(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      void handleImageFiles(files);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading local canvas…
      </div>
    );
  }

  // Photoshop-style: left toolbox (select/copy/color), center canvas, right split (top Design / bottom Layers)
  // Top bar (SiteHeader) is preserved via __root.tsx; this component's inner toolbar is kept as the "options bar".
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/25">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left: Photoshop-style toolbox */}
        <PhotoshopToolbox
          activeTool={activeTool}
          backgroundColor={project.background}
          busy={busy}
          canRedo={futureLength > 0}
          canUndo={pastLength > 0}
          foregroundColor={getLayerFill(selectedLayer) ?? project.background}
          onAddGeometry={addGeometryLayer}
          onAddImage={() => imageInputRef.current?.click()}
          onAddText={addTextLayer}
          onDuplicate={duplicateSelectedLayer}
          onRedo={redo}
          onRemove={removeSelectedLayer}
          onSelectTool={setActiveTool}
          onUndo={undo}
          selectedLayer={selectedLayer}
          foregroundColorInputRef={foregroundColorInputRef}
          backgroundColorInputRef={backgroundColorInputRef}
        />

        {/* Center: Canvas + options bar + status bar */}
        <section
          aria-label="Canvas"
          className="order-1 flex min-h-[420px] min-w-0 flex-1 flex-col lg:order-none"
        >
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[linear-gradient(45deg,rgba(127,127,127,0.08)_25%,transparent_25%),linear-gradient(-45deg,rgba(127,127,127,0.08)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(127,127,127,0.08)_75%),linear-gradient(-45deg,transparent_75%,rgba(127,127,127,0.08)_75%)] bg-size-[16px_16px] bg-position-[0_0,0_0,8px_8px,-8px_8px] p-6">
            <div className="flex max-w-full min-w-0 items-center justify-center rounded-sm border border-border bg-background p-1 shadow-2xl shadow-black/10">
              <div
                className={`editor-canvas-frame relative max-w-full overflow-hidden rounded-sm ${isImageDropTarget ? "ring-2 ring-primary ring-offset-2" : ""}`}
                onDragLeave={handleImageDragLeave}
                onDragOver={handleImageDragOver}
                onDrop={handleImageDrop}
                style={{
                  aspectRatio: `${project.width}/${project.height}`,
                  width: `${project.width * zoom}px`,
                }}
              >
                <EditorCanvas
                  ref={canvasRef}
                  assetUrls={assetUrls}
                  onChangeLayer={updateLayer}
                  onSelectLayer={selectLayer}
                  project={project}
                  selectedLayerId={selectedLayerId}
                />
                {isImageDropTarget ? (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary/10">
                    <span className="rounded-md border border-dashed border-primary bg-background/95 px-4 py-2 text-xs font-medium text-primary shadow-sm">
                      Drop image files to add them locally
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="absolute right-4 bottom-4 flex items-center gap-1 rounded-md border border-border bg-background/90 p-1 shadow-sm backdrop-blur">
              <Button
                aria-label="Zoom out"
                onPress={() => setZoom((value) => Math.max(0.5, value - 0.1))}
                size="icon-sm"
                variant="ghost"
              >
                <ZoomOut />
              </Button>
              <span className="min-w-12 text-center text-[10px] font-medium text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                aria-label="Zoom in"
                onPress={() => setZoom((value) => Math.min(2, value + 0.1))}
                size="icon-sm"
                variant="ghost"
              >
                <ZoomIn />
              </Button>
            </div>
          </div>

          <div className="flex min-h-8 shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-3 py-1 text-[10px] text-muted-foreground">
            <div className="flex min-w-0 items-center gap-2">
              <Save className="size-3" />
              <Input
                aria-label="Project name"
                className="h-5 max-w-44 border-0 bg-transparent px-1 text-[10px] shadow-none"
                onChange={(event) => updateProjectName(event.target.value)}
                value={project.name}
              />
              <span className="truncate">{notice}</span>
            </div>
            <span className="shrink-0">
              {project.width} × {project.height} px
            </span>
          </div>
        </section>

        {/* Right: Photoshop-style dock — resizable vertical (Properties / Layers) with inner resizable for layer name/state */}
        <div className="order-2 hidden min-h-0 w-full flex-col border-border bg-background lg:flex lg:w-[22rem] lg:shrink-0 lg:overflow-hidden lg:border-l xl:w-[24rem]">
          <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
            <ResizablePanel defaultSize="60%" minSize="28%">
              <PropertiesPanel
                className="flex h-full min-h-0 flex-col overflow-hidden"
                customFonts={project.fonts}
                layer={selectedLayer}
                onAddFont={handleFontUpload}
                onUpdate={updateSelected}
              />
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-border" />
            <ResizablePanel defaultSize="40%" minSize="22%">
              <LayersPanel
                className="flex h-full min-h-0 flex-col overflow-hidden"
                filter={filter}
                onAddGeometry={addGeometryLayer}
                onAddImage={() => imageInputRef.current?.click()}
                onAddText={addTextLayer}
                onFilterChange={setFilter}
                onMove={moveLayerBefore}
                onSelect={selectLayer}
                onToggleLocked={toggleLayerLocked}
                onToggleVisibility={toggleLayerVisibility}
                project={project}
                selectedLayerId={selectedLayerId}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <div className="order-2 flex min-h-0 w-full flex-col border-border bg-background lg:hidden">
          <PropertiesPanel
            className="flex min-h-0 flex-col overflow-hidden border-b"
            customFonts={project.fonts}
            layer={selectedLayer}
            onAddFont={handleFontUpload}
            onUpdate={updateSelected}
          />
          <LayersPanel
            className="flex min-h-[260px] flex-col overflow-hidden"
            filter={filter}
            onAddGeometry={addGeometryLayer}
            onAddImage={() => imageInputRef.current?.click()}
            onAddText={addTextLayer}
            onFilterChange={setFilter}
            onMove={moveLayerBefore}
            onSelect={selectLayer}
            onToggleLocked={toggleLayerLocked}
            onToggleVisibility={toggleLayerVisibility}
            project={project}
            selectedLayerId={selectedLayerId}
          />
        </div>
      </div>

      <ShortcutGuide isOpen={isHelpVisible} onOpenChange={setHelpOpen} />

      {/* Hidden inputs for toolbox color swatches */}
      <input
        ref={foregroundColorInputRef}
        className="hidden"
        type="color"
        onChange={(event) => {
          if (selectedLayer !== undefined && "fill" in selectedLayer) {
            updateSelected({ fill: event.target.value });
          }
        }}
        value={getLayerFill(selectedLayer) ?? project.background}
      />
      <input
        ref={backgroundColorInputRef}
        className="hidden"
        type="color"
        onChange={(event) => {
          const value = event.target.value;
          useEditorStore.setState((state) => ({
            project: { ...state.project, background: value },
            past: [...state.past, state.project].slice(-50),
            future: [],
          }));
          const bgLayer = project.layers.find((l) => l.id === "background");
          if (bgLayer) {
            updateLayer(bgLayer.id, { fill: value });
          }
        }}
        value={project.background}
      />

      <input
        ref={imageInputRef}
        accept={IMAGE_FILE_ACCEPT}
        className="hidden"
        onChange={(event) => void handleImageChange(event)}
        multiple
        type="file"
      />
    </div>
  );
}

interface PhotoshopToolboxProps {
  activeTool: "select" | "hand" | "pipette";
  backgroundColor: string;
  busy: boolean;
  canRedo: boolean;
  canUndo: boolean;
  foregroundColor: string;
  onAddGeometry: () => void;
  onAddImage: () => void;
  onAddText: () => void;
  onDuplicate: () => void;
  onRedo: () => void;
  onRemove: () => void;
  onSelectTool: (tool: "select" | "hand" | "pipette") => void;
  onUndo: () => void;
  selectedLayer: Layer | undefined;
  foregroundColorInputRef: React.RefObject<HTMLInputElement | null>;
  backgroundColorInputRef: React.RefObject<HTMLInputElement | null>;
}

function PhotoshopToolbox({
  activeTool,
  backgroundColor,
  busy,
  canRedo,
  canUndo,
  foregroundColor,
  onAddGeometry,
  onAddImage,
  onAddText,
  onDuplicate,
  onRedo,
  onRemove,
  onSelectTool,
  onUndo,
  selectedLayer,
  foregroundColorInputRef,
  backgroundColorInputRef,
}: PhotoshopToolboxProps) {
  const canModify = selectedLayer !== undefined && !selectedLayer.locked;
  return (
    <aside
      aria-label="Tools"
      className="hidden w-[56px] shrink-0 flex-col items-center gap-1 border-r border-zinc-800 bg-[#2b2b2b] py-3 lg:flex dark:border-zinc-800 dark:bg-[#1e1e1e]"
    >
      {/* Move / Select */}
      <ToolboxButton
        active={activeTool === "select"}
        ariaLabel="Move tool (V)"
        onPress={() => onSelectTool("select")}
      >
        <MousePointer2 className="size-[18px]" />
      </ToolboxButton>
      <ToolboxButton
        active={activeTool === "hand"}
        ariaLabel="Hand tool (H)"
        onPress={() => onSelectTool("hand")}
      >
        <Hand className="size-[18px]" />
      </ToolboxButton>

      <ToolboxSeparator />

      {/* Insert */}
      <ToolboxButton ariaLabel="Add text (T)" onPress={onAddText} isDisabled={busy}>
        <Type className="size-[18px]" />
      </ToolboxButton>
      <ToolboxButton ariaLabel="Add shape (U)" onPress={onAddGeometry} isDisabled={busy}>
        <Square className="size-[18px]" />
      </ToolboxButton>
      <ToolboxButton ariaLabel="Add image" onPress={onAddImage} isDisabled={busy}>
        <ImageIcon className="size-[18px]" />
      </ToolboxButton>

      <ToolboxSeparator />

      {/* Color / Eyedropper */}
      <ToolboxButton
        ariaLabel="Eyedropper tool (I)"
        active={activeTool === "pipette"}
        onPress={() => onSelectTool("pipette")}
      >
        <Pipette className="size-[18px]" />
      </ToolboxButton>
      <ToolboxButton
        ariaLabel="Swatches / fill color"
        onPress={() => foregroundColorInputRef.current?.click()}
      >
        <Palette className="size-[18px]" />
      </ToolboxButton>

      {/* Photoshop-style foreground/background swatches */}
      <div className="relative my-1 flex size-9 items-center justify-center">
        {/* Background swatch */}
        <button
          aria-label="Background color"
          className="absolute top-1 left-1 size-5 rounded-sm border border-white/30 shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-white"
          onClick={() => backgroundColorInputRef.current?.click()}
          style={{ backgroundColor }}
          type="button"
        />
        {/* Foreground swatch */}
        <button
          aria-label="Foreground color"
          className="absolute right-1 bottom-1 size-5 rounded-sm border border-white shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-white"
          onClick={() => foregroundColorInputRef.current?.click()}
          style={{ backgroundColor: foregroundColor }}
          type="button"
        />
        {/* Swap icon hint */}
        <div className="pointer-events-none absolute -top-0.5 -right-0.5 size-2 rounded-full border border-white/20 bg-zinc-700" />
      </div>
      <span className="px-1 text-center text-[7px] leading-none tracking-wide text-zinc-400">
        FG/BG
      </span>

      <ToolboxSeparator />

      {/* Edit */}
      <ToolboxButton ariaLabel="Duplicate layer" onPress={onDuplicate} isDisabled={!canModify}>
        <Copy className="size-[18px]" />
      </ToolboxButton>
      <ToolboxButton ariaLabel="Delete layer" onPress={onRemove} isDisabled={!canModify}>
        <Trash2 className="size-[18px]" />
      </ToolboxButton>

      <ToolboxSeparator />

      {/* History */}
      <ToolboxButton ariaLabel="Undo" onPress={onUndo} isDisabled={!canUndo}>
        <Undo2 className="size-[18px]" />
      </ToolboxButton>
      <ToolboxButton ariaLabel="Redo" onPress={onRedo} isDisabled={!canRedo}>
        <Redo2 className="size-[18px]" />
      </ToolboxButton>

      <div className="mt-auto flex flex-col items-center gap-1 pt-2">
        <span className="text-[7px] tracking-[0.14em] text-zinc-500">TOOLS</span>
        <div className="h-px w-8 bg-white/10" />
        <span className="text-[7px] text-zinc-600">PS</span>
      </div>
    </aside>
  );
}

function ToolboxButton({
  active,
  ariaLabel,
  children,
  isDisabled,
  onPress,
}: {
  active?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  isDisabled?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      disabled={isDisabled}
      onClick={onPress}
      type="button"
      className={`flex size-8 items-center justify-center rounded-[4px] border text-zinc-400 transition-colors focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? "border-white/20 bg-white/15 text-white shadow-inner"
          : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ToolboxSeparator() {
  return <div className="my-1 h-px w-8 bg-white/10" />;
}

interface LayersPanelProps {
  className?: string;
  filter: string;
  onAddGeometry: () => void;
  onAddImage: () => void;
  onAddText: () => void;
  onFilterChange: (value: string) => void;
  onMove: (sourceId: string, targetId: string) => void;
  onSelect: (id: string | null) => void;
  onToggleLocked: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  project: OgProject;
  selectedLayerId: string | null;
}

function LayersPanel({
  className,
  filter,
  onAddGeometry,
  onAddImage,
  onAddText,
  onFilterChange,
  onMove,
  onSelect,
  onToggleLocked,
  onToggleVisibility,
  project,
  selectedLayerId,
}: LayersPanelProps) {
  const draggedLayerId = useRef<string | null>(null);
  const editingId = useEditorStore((state) => state.editingLayerId);
  const editingName = useEditorStore((state) => state.editingLayerName);
  const setEditingLayerId = useEditorStore((state) => state.setEditingLayerId);
  const setEditingLayerName = useEditorStore((state) => state.setEditingLayerName);
  const commitRename = useEditorStore((state) => state.commitRename);
  const cancelRename = useEditorStore((state) => state.cancelRename);
  const visibleLayers = project.layers
    .toReversed()
    .filter((layer) => layer.name.toLowerCase().includes(filter.toLowerCase()));

  function handleRenameStart(layer: Layer): void {
    if (layer.locked) {
      return;
    }
    setEditingLayerId(layer.id);
    setEditingLayerName(layer.name);
  }

  function handleRenameCommit(): void {
    commitRename();
  }

  function handleRenameCancel(): void {
    cancelRename();
  }

  return (
    <aside aria-label="Layers" className={`flex min-h-0 flex-col bg-background ${className ?? ""}`}>
      <PanelHeader icon={Layers3} label="Layers">
        <Button aria-label="Add text layer" onPress={onAddText} size="icon-sm" variant="ghost">
          <Plus />
        </Button>
        <Button aria-label="Layer options" size="icon-sm" variant="ghost">
          <MoreHorizontal />
        </Button>
      </PanelHeader>
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search layers"
            className="pl-7"
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="Search layers"
            value={filter}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {visibleLayers.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">No matching layers</p>
        ) : (
          visibleLayers.map((layer) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              editing={editingId === layer.id}
              editingName={editingName}
              onDragStart={() => {
                draggedLayerId.current = layer.id;
              }}
              onDrop={() => {
                if (draggedLayerId.current !== null) {
                  onMove(draggedLayerId.current, layer.id);
                  draggedLayerId.current = null;
                }
              }}
              onEditingNameChange={setEditingLayerName}
              onRenameCancel={handleRenameCancel}
              onRenameCommit={handleRenameCommit}
              onRenameStart={() => handleRenameStart(layer)}
              onSelect={() => onSelect(layer.id)}
              onToggleLocked={() => onToggleLocked(layer.id)}
              onToggleVisibility={() => onToggleVisibility(layer.id)}
              selected={selectedLayerId === layer.id}
            />
          ))
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
        <span>{project.layers.length} layers</span>
        <span>
          {project.width} × {project.height}
        </span>
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <Button className="flex-1" onPress={onAddText} size="default" variant="outline">
          <Type />
          Text
        </Button>
        <Button className="flex-1" onPress={onAddGeometry} size="default" variant="outline">
          <Square />
          Shape
        </Button>
        <Button
          aria-label="Upload local image"
          className="flex-1"
          onPress={onAddImage}
          size="default"
          variant="outline"
        >
          <ImageIcon />
          Image
        </Button>
      </div>
    </aside>
  );
}

interface LayerRowProps {
  layer: Layer;
  editing: boolean;
  editingName: string;
  onDragStart: () => void;
  onDrop: () => void;
  onEditingNameChange: (value: string) => void;
  onRenameCancel: () => void;
  onRenameCommit: () => void;
  onRenameStart: () => void;
  onSelect: () => void;
  onToggleLocked: () => void;
  onToggleVisibility: () => void;
  selected: boolean;
}

function LayerRow({
  editing,
  editingName,
  layer,
  onDragStart,
  onDrop,
  onEditingNameChange,
  onRenameCancel,
  onRenameCommit,
  onRenameStart,
  onSelect,
  onToggleLocked,
  onToggleVisibility,
  selected,
}: LayerRowProps) {
  const duplicateLayer = useEditorStore((state) => state.duplicateLayer);
  const removeLayer = useEditorStore((state) => state.removeLayer);
  const resetLayer = useEditorStore((state) => state.resetLayer);
  const Icon = layer.type === "text" ? Type : layer.type === "image" ? ImageIcon : Square;
  const detail = layer.type === "text" ? "Text" : layer.type === "image" ? "Image" : "Shape";

  return (
    <ContextMenuTrigger>
      <Pressable>
        <div
          className={`group flex items-center gap-1 rounded-md px-1 py-1 text-xs ${selected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"} ${layer.visible ? "" : "opacity-50"}`}
          draggable={!layer.locked && !editing}
          onContextMenu={() => onSelect()}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={onDragStart}
          onDrop={onDrop}
        >
          {editing ? (
            <div className="flex min-w-0 flex-1 items-center gap-1 px-1.5">
              <Icon className="size-3.5 shrink-0" />
              <Input
                aria-label={`Rename ${layer.name}`}
                // oxlint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                className="h-6 flex-1"
                onBlur={onRenameCommit}
                onChange={(event) => onEditingNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onRenameCommit();
                  }
                  if (event.key === "Escape") {
                    onRenameCancel();
                  }
                }}
                value={editingName}
              />
            </div>
          ) : (
            <Button
              aria-label={`Select ${layer.name}`}
              className="min-w-0 flex-1 justify-start px-1.5"
              onPress={onSelect}
              size="default"
              variant="ghost"
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">{layer.name}</span>
              <span className="text-[10px] text-muted-foreground">{detail}</span>
            </Button>
          )}
          <Button
            aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
            onPress={onToggleVisibility}
            size="icon-sm"
            variant="ghost"
          >
            {layer.visible ? <Eye /> : <EyeOff />}
          </Button>
          <Button
            aria-label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
            onPress={onToggleLocked}
            size="icon-sm"
            variant="ghost"
          >
            {layer.locked ? <LockKeyhole /> : <Unlock />}
          </Button>
        </div>
      </Pressable>
      <ContextMenu>
        <ContextMenuItem onAction={onRenameStart} isDisabled={layer.locked}>
          <Pencil />
          Rename
        </ContextMenuItem>
        <ContextMenuItem isDisabled={layer.locked} onAction={() => duplicateLayer(layer.id)}>
          <Copy />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem isDisabled={layer.locked} onAction={() => resetLayer(layer.id)}>
          <RefreshCw />
          Refresh
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          isDisabled={layer.locked}
          onAction={() => removeLayer(layer.id)}
          variant="destructive"
        >
          <Trash2 />
          Delete
        </ContextMenuItem>
      </ContextMenu>
    </ContextMenuTrigger>
  );
}

interface PropertiesPanelProps {
  className?: string;
  customFonts: FontMeta[];
  layer: Layer | undefined;
  onAddFont: (file: File, options: FontUploadOptions) => Promise<void>;
  onUpdate: (patch: LayerPatch) => void;
}

function PropertiesPanel({
  className,
  customFonts,
  layer,
  onAddFont,
  onUpdate,
}: PropertiesPanelProps) {
  return (
    <aside
      aria-label="Design properties"
      className={`flex min-h-0 flex-col bg-background ${className ?? ""}`}
    >
      <PanelHeader icon={SlidersHorizontal} label="Properties" />
      {layer === undefined ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
          <MousePointer2 className="size-5" />
          <p>Select a layer to edit its properties.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <PropertySection icon={Frame} label="Position & size">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="X" onChange={(value) => onUpdate({ x: value })} value={layer.x} />
              <NumberField label="Y" onChange={(value) => onUpdate({ y: value })} value={layer.y} />
              <NumberField
                label="W"
                min={1}
                onChange={(value) => onUpdate({ width: value })}
                value={layer.width}
              />
              <NumberField
                label="H"
                min={1}
                onChange={(value) => onUpdate({ height: value })}
                value={layer.height}
              />
              <NumberField
                label="Rotation"
                onChange={(value) => onUpdate({ rotation: value })}
                suffix="°"
                value={layer.rotation}
              />
              <NumberField
                label="Opacity"
                max={1}
                min={0}
                onChange={(value) => onUpdate({ opacity: value })}
                step={0.05}
                value={layer.opacity}
              />
            </div>
          </PropertySection>

          {isTextLayer(layer) ? (
            <TextProperties
              customFonts={customFonts}
              layer={layer}
              onAddFont={onAddFont}
              onUpdate={onUpdate}
            />
          ) : null}
          {isGeometryLayer(layer) ? <GeometryProperties layer={layer} onUpdate={onUpdate} /> : null}
          {isImageLayer(layer) ? <ImageProperties layer={layer} onUpdate={onUpdate} /> : null}
        </div>
      )}
    </aside>
  );
}

const BUNDLED_FONT_FAMILIES = ["Pretendard", "Zilla Slab", "Google Sans Code"] as const;

const FONT_WEIGHT_OPTIONS = [
  [400, "Regular"],
  [500, "Medium"],
  [600, "Semibold"],
  [700, "Bold"],
  [800, "Extra bold"],
] as const;

function fontFamilyFromFileName(name: string): string {
  return (
    name
      .replace(/\.(woff2?|ttf|otf)$/i, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Custom font"
  );
}

function fontStyleValue(value: string): FontUploadOptions["style"] {
  return value === "italic" ? "italic" : "normal";
}

function TextProperties({
  customFonts,
  layer,
  onAddFont,
  onUpdate,
}: {
  customFonts: FontMeta[];
  layer: Extract<Layer, { type: "text" }>;
  onAddFont: (file: File, options: FontUploadOptions) => Promise<void>;
  onUpdate: (patch: LayerPatch) => void;
}) {
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [fontFamily, setFontFamily] = useState("");
  const [fontStyle, setFontStyle] = useState<FontUploadOptions["style"]>("normal");
  const [fontVariable, setFontVariable] = useState(true);
  const [fontWeight, setFontWeight] = useState(400);
  const [fontUploadBusy, setFontUploadBusy] = useState(false);
  const customFontFamilies = [...new Set(customFonts.map((font) => font.family))];
  const availableFamilies = new Set([...BUNDLED_FONT_FAMILIES, ...customFontFamilies]);

  function handleFontFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) {
      return;
    }
    setFontFile(file);
    setFontFamily(fontFamilyFromFileName(file.name));
  }

  async function handleFontSubmit(): Promise<void> {
    if (fontFile === null || fontFamily.trim() === "") {
      return;
    }

    setFontUploadBusy(true);
    try {
      await onAddFont(fontFile, {
        family: fontFamily.trim(),
        style: fontStyle,
        variable: fontVariable,
        weight: fontWeight,
      });
      setFontFile(null);
      setFontFamily("");
    } catch {
      // The editor reports the loading error in its local status message.
    } finally {
      setFontUploadBusy(false);
    }
  }

  return (
    <PropertySection icon={Type} label="Typography">
      <div className="space-y-2">
        <label className="block text-[10px] text-muted-foreground" htmlFor="text-content">
          Text
        </label>
        <textarea
          className="min-h-20 w-full resize-y rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          id="text-content"
          onChange={(event) => onUpdate({ text: event.target.value })}
          value={layer.text}
        />
        <label className="block text-[10px] text-muted-foreground" htmlFor="font-family">
          Font family
        </label>
        <select
          className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
          id="font-family"
          onChange={(event) => onUpdate({ fontFamily: event.target.value })}
          value={layer.fontFamily}
        >
          <optgroup label="Bundled fonts">
            {BUNDLED_FONT_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </optgroup>
          {customFontFamilies.length > 0 ? (
            <optgroup label="Your fonts">
              {customFontFamilies.map((family) => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
            </optgroup>
          ) : null}
          {!availableFamilies.has(layer.fontFamily) ? (
            <option value={layer.fontFamily}>{`${layer.fontFamily} (saved project)`}</option>
          ) : null}
        </select>
        <div className="space-y-2 rounded-md border border-dashed border-border p-2">
          <Button
            aria-label="Upload custom font"
            className="w-full"
            onPress={() => fontInputRef.current?.click()}
            size="sm"
            variant="outline"
          >
            <FileType />
            Upload font
          </Button>
          <input
            ref={fontInputRef}
            accept={FONT_FILE_ACCEPT}
            className="hidden"
            onChange={handleFontFileChange}
            type="file"
          />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Variable WOFF2 fonts are recommended because one file can cover multiple weights.
          </p>
          {fontFile !== null ? (
            <div className="space-y-2 border-t border-border pt-2">
              <p className="truncate text-[10px] font-medium" title={fontFile.name}>
                {fontFile.name}
              </p>
              <label
                className="flex flex-col gap-1 text-[10px] text-muted-foreground"
                htmlFor="custom-font-family"
              >
                <span>Family name</span>
                <Input
                  id="custom-font-family"
                  onChange={(event) => setFontFamily(event.target.value)}
                  value={fontFamily}
                />
              </label>
              <label className="flex items-start gap-2 text-[10px] text-muted-foreground">
                <input
                  checked={fontVariable}
                  className="mt-0.5"
                  onChange={(event) => setFontVariable(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  Variable font
                  <span className="block opacity-75">
                    Recommended for flexible weight selection.
                  </span>
                </span>
              </label>
              {!fontVariable ? (
                <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                  Fixed weight
                  <select
                    className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs text-foreground"
                    onChange={(event) => setFontWeight(Number(event.target.value))}
                    value={fontWeight}
                  >
                    {FONT_WEIGHT_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                Style
                <select
                  className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs text-foreground"
                  onChange={(event) => setFontStyle(fontStyleValue(event.target.value))}
                  value={fontStyle}
                >
                  <option value="normal">Normal</option>
                  <option value="italic">Italic</option>
                </select>
              </label>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  isDisabled={fontUploadBusy || fontFamily.trim() === ""}
                  onPress={() => void handleFontSubmit()}
                  size="sm"
                >
                  Add font
                </Button>
                <Button
                  isDisabled={fontUploadBusy}
                  onPress={() => setFontFile(null)}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Size"
            min={1}
            onChange={(value) => onUpdate({ fontSize: value })}
            suffix="px"
            value={layer.fontSize}
          />
          <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
            Weight
            <select
              className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs text-foreground"
              onChange={(event) => onUpdate({ fontWeight: Number(event.target.value) })}
              value={layer.fontWeight}
            >
              {FONT_WEIGHT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ColorField
          label="Color"
          onChange={(event) => onUpdate({ fill: event.target.value })}
          value={layer.fill}
        />
        <div className="grid grid-cols-3 gap-1">
          <Button
            aria-label="Align left"
            className={layer.textAlign === "left" ? "bg-primary/10 text-primary" : ""}
            onPress={() => onUpdate({ textAlign: "left" })}
            size="icon-sm"
            variant="ghost"
          >
            <AlignLeft />
          </Button>
          <Button
            aria-label="Align center"
            className={layer.textAlign === "center" ? "bg-primary/10 text-primary" : ""}
            onPress={() => onUpdate({ textAlign: "center" })}
            size="icon-sm"
            variant="ghost"
          >
            <AlignCenter />
          </Button>
          <Button
            aria-label="Align right"
            className={layer.textAlign === "right" ? "bg-primary/10 text-primary" : ""}
            onPress={() => onUpdate({ textAlign: "right" })}
            size="icon-sm"
            variant="ghost"
          >
            <AlignRight />
          </Button>
        </div>
      </div>
    </PropertySection>
  );
}

function GeometryProperties({
  layer,
  onUpdate,
}: {
  layer: Extract<Layer, { type: "shape" }>;
  onUpdate: (patch: LayerPatch) => void;
}) {
  return (
    <PropertySection icon={Palette} label="Shape">
      <div className="space-y-2">
        <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
          Type
          <select
            className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs text-foreground"
            onChange={(event) => onUpdate({ geometry: geometryValue(event.target.value) })}
            value={layer.geometry}
          >
            <option value="rectangle">Rectangle</option>
            <option value="circle">Ellipse</option>
          </select>
        </label>
        <ColorField
          label="Fill"
          onChange={(event) => onUpdate({ fill: event.target.value })}
          value={layer.fill}
        />
        {layer.geometry === "rectangle" ? (
          <NumberField
            label="Radius"
            min={0}
            onChange={(value) => onUpdate({ cornerRadius: value })}
            suffix="px"
            value={layer.cornerRadius}
          />
        ) : null}
      </div>
    </PropertySection>
  );
}

function ImageProperties({
  layer,
  onUpdate,
}: {
  layer: Extract<Layer, { type: "image" }>;
  onUpdate: (patch: LayerPatch) => void;
}) {
  return (
    <PropertySection icon={ImageIcon} label="Image">
      <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
        Fit
        <select
          className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs text-foreground"
          onChange={(event) => onUpdate({ fit: fitValue(event.target.value) })}
          value={layer.fit}
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
        </select>
      </label>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Images are kept in this browser and included in project exports.
      </p>
    </PropertySection>
  );
}

function NumberField({
  label,
  max,
  min,
  onChange,
  step = 1,
  suffix,
  value,
}: {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
  value: number;
}) {
  return (
    <label className="flex items-center justify-between gap-1 rounded-md border border-input bg-input/20 px-2 py-0.5 text-[10px] text-muted-foreground">
      <span>{label}</span>
      <span className="flex min-w-0 items-center gap-1">
        <input
          className="w-14 min-w-0 bg-transparent text-right text-xs text-foreground outline-none"
          max={max}
          min={min}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            if (Number.isFinite(nextValue)) {
              onChange(nextValue);
            }
          }}
          step={step}
          type="number"
          value={value}
        />
        {suffix ? <span>{suffix}</span> : null}
      </span>
    </label>
  );
}

function ColorField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  return (
    <label className="flex items-center justify-between rounded-md border border-input bg-input/20 px-2 py-1 text-[10px] text-muted-foreground">
      <span>{label}</span>
      <span className="flex items-center gap-2 text-xs text-foreground">
        <input
          className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
          onChange={onChange}
          type="color"
          value={value}
        />
        {value.toUpperCase()}
      </span>
    </label>
  );
}

function geometryValue(value: string): "circle" | "rectangle" {
  return value === "circle" ? "circle" : "rectangle";
}

function fitValue(value: string): "contain" | "cover" {
  return value === "cover" ? "cover" : "contain";
}

function PanelHeader({
  children,
  icon: Icon,
  label,
}: {
  children?: React.ReactNode;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
      <div className="flex items-center gap-2 text-xs font-medium">
        <Icon className="size-3.5 text-primary" />
        {label}
      </div>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  );
}

function PropertySection({
  children,
  icon: Icon,
  label,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <section className="border-b border-border py-4 first:pt-0 last:border-b-0">
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-medium">
        <Icon className="size-3.5 text-primary" />
        {label}
        <ChevronDown className="ml-auto size-3.5 text-muted-foreground" />
      </h2>
      {children}
    </section>
  );
}
