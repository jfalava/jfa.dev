import { Button, Input } from "@jfa.dev/common/ui";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Boxes,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  FileDown,
  FileUp,
  Frame,
  Hand,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  MoreHorizontal,
  MousePointer2,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
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
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { EditorCanvas, type EditorCanvasHandle } from "@/components/editor-canvas";
import {
  archiveFileName,
  createProjectArchive,
  downloadBlob,
  readProjectArchive,
} from "@/editor/archive";
import {
  createInitialProject,
  isImageLayer,
  isGeometryLayer,
  isTextLayer,
  type Layer,
  type LayerPatch,
  type OgProject,
} from "@/editor/model";
import {
  deleteUnusedAssets,
  loadAssetUrl,
  loadProject,
  saveImageAsset,
  saveProject,
} from "@/editor/storage";
import { useEditorStore } from "@/editor/store";

export const Route = createFileRoute("/")({ component: EditorPage });

function EditorPage() {
  const project = useEditorStore((state) => state.project);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const hydrated = useEditorStore((state) => state.hydrated);
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const updateLayer = useEditorStore((state) => state.updateLayer);
  const addTextLayer = useEditorStore((state) => state.addTextLayer);
  const addGeometryLayer = useEditorStore((state) => state.addGeometryLayer);
  const addImageLayer = useEditorStore((state) => state.addImageLayer);
  const updateProjectName = useEditorStore((state) => state.updateProjectName);
  const resetProject = useEditorStore((state) => state.resetProject);
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
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [assetUrls, setAssetUrls] = useState<ReadonlyMap<string, string>>(new Map());
  const [filter, setFilter] = useState("");
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Saved locally in this browser");

  const selectedLayer = project.layers.find(({ id }) => id === selectedLayerId);

  useEffect(() => {
    let cancelled = false;
    async function restoreProject(): Promise<void> {
      try {
        const storedProject = await loadProject();
        if (!cancelled) {
          useEditorStore.getState().hydrate(storedProject ?? createInitialProject());
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

  useEffect(() => {
    if (!hydrated) {
      return undefined;
    }

    const saveTimer = window.setTimeout(() => {
      async function persistProject(): Promise<void> {
        try {
          await saveProject(project);
          await deleteUnusedAssets(project);
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

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) {
      return;
    }

    setBusy(true);
    try {
      const asset = await saveImageAsset(file);
      addImageLayer(asset);
      setNotice("Image added from this device");
    } catch {
      setNotice("That image could not be read by this browser");
    } finally {
      setBusy(false);
    }
  }

  async function handleProjectImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) {
      return;
    }

    setBusy(true);
    try {
      const importedProject = await readProjectArchive(file);
      useEditorStore.getState().hydrate(importedProject);
      setNotice("Project imported locally");
    } catch {
      setNotice("That project file could not be imported");
    } finally {
      setBusy(false);
    }
  }

  async function handleProjectExport(): Promise<void> {
    setBusy(true);
    try {
      const archive = await createProjectArchive(project);
      downloadBlob(archive, archiveFileName(project));
      setNotice("Project archive downloaded");
    } catch {
      setNotice("The project archive could not be created");
    } finally {
      setBusy(false);
    }
  }

  async function handlePngDownload(): Promise<void> {
    setBusy(true);
    try {
      const blob = await canvasRef.current?.download();
      if (blob === null || blob === undefined) {
        throw new Error("Canvas is not ready");
      }
      downloadBlob(blob, `${project.name || "untitled-canvas"}.png`);
      setNotice("PNG downloaded");
    } catch {
      setNotice("The PNG could not be rendered");
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading local canvas…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/25">
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[17rem_minmax(0,1fr)_19rem]">
        <LayersPanel
          filter={filter}
          onAddGeometry={addGeometryLayer}
          onAddText={addTextLayer}
          onFilterChange={setFilter}
          onMove={moveLayerBefore}
          onSelect={selectLayer}
          onToggleLocked={toggleLayerLocked}
          onToggleVisibility={toggleLayerVisibility}
          project={project}
          selectedLayerId={selectedLayerId}
        />

        <section aria-label="Canvas" className="flex min-h-[34rem] min-w-0 flex-1 flex-col">
          <div className="flex min-h-10 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-3 py-1.5">
            <div className="flex items-center gap-1">
              <Button
                aria-label="Select tool"
                className="bg-primary/10 text-primary"
                size="icon-xs"
                variant="ghost"
              >
                <MousePointer2 />
              </Button>
              <Button aria-label="Pan tool" size="icon-xs" variant="ghost">
                <Hand />
              </Button>
              <span className="mx-1 h-4 w-px bg-border" />
              <Button
                aria-label="Undo"
                isDisabled={pastLength === 0}
                onPress={undo}
                size="icon-xs"
                variant="ghost"
              >
                <Undo2 />
              </Button>
              <Button
                aria-label="Redo"
                isDisabled={futureLength === 0}
                onPress={redo}
                size="icon-xs"
                variant="ghost"
              >
                <Redo2 />
              </Button>
              <span className="mx-1 h-4 w-px bg-border" />
              <Button
                aria-label="Add text to canvas"
                isDisabled={busy}
                onPress={addTextLayer}
                size="sm"
                variant="ghost"
              >
                <Type />
                Text
              </Button>
              <Button
                aria-label="Add shape to canvas"
                isDisabled={busy}
                onPress={addGeometryLayer}
                size="sm"
                variant="ghost"
              >
                <Square />
                Shape
              </Button>
              <Button
                aria-label="Add image to canvas"
                isDisabled={busy}
                onPress={() => imageInputRef.current?.click()}
                size="sm"
                variant="ghost"
              >
                <ImageIcon />
                Image
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button isDisabled={busy} onPress={resetProject} size="sm" variant="ghost">
                <Plus />
                New
              </Button>
              <Button
                isDisabled={busy}
                onPress={() => projectInputRef.current?.click()}
                size="sm"
                variant="outline"
              >
                <FileUp />
                Import
              </Button>
              <Button
                isDisabled={busy}
                onPress={() => void handleProjectExport()}
                size="sm"
                variant="outline"
              >
                <FileDown />
                Export
              </Button>
              <Button isDisabled={busy} onPress={() => void handlePngDownload()} size="sm">
                <Download />
                PNG
              </Button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto [background-image:linear-gradient(45deg,rgba(127,127,127,0.08)_25%,transparent_25%),linear-gradient(-45deg,rgba(127,127,127,0.08)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(127,127,127,0.08)_75%),linear-gradient(-45deg,transparent_75%,rgba(127,127,127,0.08)_75%)] [background-size:16px_16px] [background-position:0_0,0_0,8px_8px,-8px_8px] p-6">
            <div className="flex max-w-full min-w-0 items-center justify-center rounded-sm border border-border bg-background p-1 shadow-2xl shadow-black/10">
              <div
                className="editor-canvas-frame relative max-w-full overflow-hidden rounded-sm"
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
              </div>
            </div>
            <div className="absolute right-4 bottom-4 flex items-center gap-1 rounded-md border border-border bg-background/90 p-1 shadow-sm backdrop-blur">
              <Button
                aria-label="Zoom out"
                onPress={() => setZoom((value) => Math.max(0.5, value - 0.1))}
                size="icon-xs"
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
                size="icon-xs"
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

        <PropertiesPanel
          layer={selectedLayer}
          onDelete={removeSelectedLayer}
          onReset={() => {
            if (selectedLayer !== undefined) {
              updateLayer(selectedLayer.id, createLayerReset(selectedLayer));
            }
          }}
          onUpdate={updateSelected}
        />
      </div>

      <input
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleImageChange(event)}
        type="file"
      />
      <input
        ref={projectInputRef}
        accept=".ogproj,application/zip"
        className="hidden"
        onChange={(event) => void handleProjectImport(event)}
        type="file"
      />
    </div>
  );
}

interface LayersPanelProps {
  filter: string;
  onAddGeometry: () => void;
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
  filter,
  onAddGeometry,
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
  const visibleLayers = project.layers
    .toReversed()
    .filter((layer) => layer.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <aside
      aria-label="Layers"
      className="flex min-h-60 flex-col border-b border-border bg-background lg:min-h-0 lg:border-r lg:border-b-0"
    >
      <PanelHeader icon={Layers3} label="Layers">
        <Button aria-label="Add text layer" onPress={onAddText} size="icon-xs" variant="ghost">
          <Plus />
        </Button>
        <Button aria-label="Layer options" size="icon-xs" variant="ghost">
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
              onDragStart={() => {
                draggedLayerId.current = layer.id;
              }}
              onDrop={() => {
                if (draggedLayerId.current !== null) {
                  onMove(draggedLayerId.current, layer.id);
                  draggedLayerId.current = null;
                }
              }}
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
        <Button className="flex-1" onPress={onAddText} size="sm" variant="outline">
          <Type />
          Text
        </Button>
        <Button className="flex-1" onPress={onAddGeometry} size="sm" variant="outline">
          <Square />
          Shape
        </Button>
      </div>
    </aside>
  );
}

interface LayerRowProps {
  layer: Layer;
  onDragStart: () => void;
  onDrop: () => void;
  onSelect: () => void;
  onToggleLocked: () => void;
  onToggleVisibility: () => void;
  selected: boolean;
}

function LayerRow({
  layer,
  onDragStart,
  onDrop,
  onSelect,
  onToggleLocked,
  onToggleVisibility,
  selected,
}: LayerRowProps) {
  const Icon = layer.type === "text" ? Type : layer.type === "image" ? ImageIcon : Square;
  const detail = layer.type === "text" ? "Text" : layer.type === "image" ? "Image" : "Shape";

  return (
    <div
      className={`group flex items-center gap-1 rounded-md px-1 py-1 text-xs ${selected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"} ${layer.visible ? "" : "opacity-50"}`}
      draggable={!layer.locked}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <Button
        aria-label={`Select ${layer.name}`}
        className="min-w-0 flex-1 justify-start px-1.5"
        onPress={onSelect}
        size="sm"
        variant="ghost"
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{layer.name}</span>
        <span className="text-[10px] text-muted-foreground">{detail}</span>
      </Button>
      <Button
        aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
        onPress={onToggleVisibility}
        size="icon-xs"
        variant="ghost"
      >
        {layer.visible ? <Eye /> : <EyeOff />}
      </Button>
      <Button
        aria-label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
        onPress={onToggleLocked}
        size="icon-xs"
        variant="ghost"
      >
        {layer.locked ? <LockKeyhole /> : <Unlock />}
      </Button>
    </div>
  );
}

interface PropertiesPanelProps {
  layer: Layer | undefined;
  onDelete: () => void;
  onReset: () => void;
  onUpdate: (patch: LayerPatch) => void;
}

function PropertiesPanel({ layer, onDelete, onReset, onUpdate }: PropertiesPanelProps) {
  return (
    <aside
      aria-label="Design properties"
      className="flex min-h-80 flex-col border-t border-border bg-background lg:min-h-0 lg:border-t-0 lg:border-l"
    >
      <PanelHeader icon={SlidersHorizontal} label="Design">
        <Button
          aria-label="Reset selected layer"
          isDisabled={layer === undefined}
          onPress={onReset}
          size="icon-xs"
          variant="ghost"
        >
          <RotateCcw />
        </Button>
        <Button
          aria-label="Delete selected layer"
          isDisabled={layer === undefined || layer.locked}
          onPress={onDelete}
          size="icon-xs"
          variant="ghost"
        >
          <Trash2 />
        </Button>
      </PanelHeader>
      {layer === undefined ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
          <MousePointer2 className="size-5" />
          <p>Select a layer to edit its properties.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div className="mb-4 space-y-2">
            <label
              className="block text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              htmlFor="layer-name"
            >
              Layer name
            </label>
            <Input
              id="layer-name"
              onChange={(event) => onUpdate({ name: event.target.value })}
              value={layer.name}
            />
          </div>
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

          {isTextLayer(layer) ? <TextProperties layer={layer} onUpdate={onUpdate} /> : null}
          {isGeometryLayer(layer) ? <GeometryProperties layer={layer} onUpdate={onUpdate} /> : null}
          {isImageLayer(layer) ? <ImageProperties layer={layer} onUpdate={onUpdate} /> : null}

          <PropertySection icon={Boxes} label="Layer state">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onPress={() => onUpdate({ visible: !layer.visible })}
                size="sm"
                variant="outline"
              >
                {layer.visible ? <Eye /> : <EyeOff />}
                {layer.visible ? "Visible" : "Hidden"}
              </Button>
              <Button
                onPress={() => onUpdate({ locked: !layer.locked })}
                size="sm"
                variant="outline"
              >
                {layer.locked ? <LockKeyhole /> : <Unlock />}
                {layer.locked ? "Locked" : "Editable"}
              </Button>
            </div>
          </PropertySection>
        </div>
      )}
    </aside>
  );
}

function TextProperties({
  layer,
  onUpdate,
}: {
  layer: Extract<Layer, { type: "text" }>;
  onUpdate: (patch: LayerPatch) => void;
}) {
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
          <option value="Pretendard">Pretendard</option>
          <option value="Inter">Inter</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="monospace">Monospace</option>
        </select>
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
              <option value={400}>Regular</option>
              <option value={500}>Medium</option>
              <option value={600}>Semibold</option>
              <option value={700}>Bold</option>
              <option value={800}>Extra bold</option>
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

function createLayerReset(layer: Layer): LayerPatch {
  return {
    height: layer.type === "text" ? 80 : layer.height,
    rotation: 0,
    width: layer.type === "text" ? 520 : layer.width,
    x: layer.type === "text" ? 160 : layer.x,
    y: layer.type === "text" ? 180 : layer.y,
  };
}

function PanelHeader({
  children,
  icon: Icon,
  label,
}: {
  children: React.ReactNode;
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
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
        <ChevronDown className="ml-auto size-3.5 text-muted-foreground" />
      </h2>
      {children}
    </section>
  );
}
