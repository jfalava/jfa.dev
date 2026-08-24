import { create } from "zustand";

import {
  createId,
  createInitialProject,
  projectSchema,
  type AssetMeta,
  type FontMeta,
  type Layer,
  type LayerPatch,
  type OgProject,
} from "@/editor/model";

const HISTORY_LIMIT = 50;

export interface TabState {
  id: string;
  project: OgProject;
  selectedLayerId: string | null;
  past: OgProject[];
  future: OgProject[];
}

function cloneProject(project: OgProject): OgProject {
  return structuredClone(project);
}

function getTabDisplayName(index: number): string {
  return index === 0 ? "Untitled canvas" : `Untitled canvas ${index + 1}`;
}

function createNewTab(index: number): TabState {
  const project = createInitialProject({ name: getTabDisplayName(index) });
  return {
    id: project.id,
    project,
    selectedLayerId: project.layers.at(-1)?.id ?? null,
    past: [],
    future: [],
  };
}

function createTabFromProject(project: OgProject): TabState {
  return {
    id: project.id,
    project: cloneProject(project),
    selectedLayerId: project.layers.at(-1)?.id ?? null,
    past: [],
    future: [],
  };
}

function commitProject(
  tab: TabState,
  nextProject: OgProject,
  selectedLayerId: string | null = tab.selectedLayerId,
): TabState {
  return {
    ...tab,
    project: nextProject,
    selectedLayerId,
    past: [...tab.past, tab.project].slice(-HISTORY_LIMIT),
    future: [],
  };
}

function replaceLayer(project: OgProject, id: string, patch: LayerPatch): OgProject {
  const nextLayers = project.layers.map((layer) =>
    layer.id === id ? { ...layer, ...patch } : layer,
  );
  return projectSchema.parse({
    ...project,
    layers: nextLayers,
  });
}

interface EditorState {
  tabs: TabState[];
  activeTabId: string;
  // derived active-tab mirrors for backwards compat
  project: OgProject;
  selectedLayerId: string | null;
  past: OgProject[];
  future: OgProject[];
  hydrated: boolean;
  notice: string;
  busy: boolean;
  isHelpOpen: boolean;
  isHelpHeld: boolean;
  editingLayerId: string | null;
  editingLayerName: string;
  hydrate: (project: OgProject) => void;
  hydrateTabs: (tabs: TabState[], activeTabId: string) => void;
  switchTab: (id: string) => void;
  createTab: () => void;
  closeTab: (id: string) => void;
  duplicateTab: (id: string) => void;
  openProject: (project: OgProject) => void;
  selectLayer: (id: string | null) => void;
  updateProjectName: (name: string) => void;
  updateLayer: (id: string, patch: LayerPatch) => void;
  addTextLayer: () => void;
  addGeometryLayer: () => void;
  addImageLayer: (asset: AssetMeta) => void;
  addFont: (font: FontMeta) => void;
  removeSelectedLayer: () => void;
  removeLayer: (id: string) => void;
  duplicateSelectedLayer: () => void;
  duplicateLayer: (id: string) => void;
  resetLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLocked: (id: string) => void;
  moveLayerBefore: (sourceId: string, targetId: string) => void;
  resetProject: () => void;
  setCanvasSize: (width: number, height: number) => void;
  setNotice: (notice: string) => void;
  setBusy: (busy: boolean) => void;
  setHelpOpen: (isHelpOpen: boolean) => void;
  setHelpHeld: (isHelpHeld: boolean) => void;
  setEditingLayerId: (id: string | null) => void;
  setEditingLayerName: (name: string) => void;
  startRenamingSelected: () => void;
  commitRename: () => void;
  cancelRename: () => void;
  undo: () => void;
  redo: () => void;
}

function withActiveTab(
  state: EditorState,
  updater: (tab: TabState) => TabState,
): Partial<EditorState> {
  const activeIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
  if (activeIndex === -1) {
    return state;
  }
  const activeTab = state.tabs[activeIndex];
  if (activeTab === undefined) {
    return state;
  }
  const nextTab = updater(activeTab);
  const nextTabs = [...state.tabs];
  nextTabs[activeIndex] = nextTab;
  return {
    tabs: nextTabs,
    project: nextTab.project,
    selectedLayerId: nextTab.selectedLayerId,
    past: nextTab.past,
    future: nextTab.future,
  };
}

const initialTab = createNewTab(0);

export const useEditorStore = create<EditorState>((set) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,
  project: initialTab.project,
  selectedLayerId: initialTab.selectedLayerId,
  past: initialTab.past,
  future: initialTab.future,
  hydrated: false,
  notice: "Saved locally in this browser",
  busy: false,
  isHelpOpen: false,
  isHelpHeld: false,
  editingLayerId: null,
  editingLayerName: "",

  hydrate: (project) =>
    set(() => {
      const tab = createTabFromProject(project);
      return {
        tabs: [tab],
        activeTabId: tab.id,
        project: tab.project,
        selectedLayerId: tab.selectedLayerId,
        past: [],
        future: [],
        hydrated: true,
        editingLayerId: null,
        editingLayerName: "",
      };
    }),

  hydrateTabs: (tabs, activeTabId) =>
    set(() => {
      if (tabs.length === 0) {
        const fallback = createNewTab(0);
        return {
          tabs: [fallback],
          activeTabId: fallback.id,
          project: fallback.project,
          selectedLayerId: fallback.selectedLayerId,
          past: [],
          future: [],
          hydrated: true,
          editingLayerId: null,
          editingLayerName: "",
        };
      }
      const active = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
      if (active === undefined) {
        const fallback = createNewTab(0);
        return {
          tabs: [fallback],
          activeTabId: fallback.id,
          project: fallback.project,
          selectedLayerId: fallback.selectedLayerId,
          past: [],
          future: [],
          hydrated: true,
          editingLayerId: null,
          editingLayerName: "",
        };
      }
      return {
        tabs: tabs.map((t) => ({
          ...t,
          project: cloneProject(t.project),
          past: [...t.past],
          future: [...t.future],
        })),
        activeTabId: active.id,
        project: cloneProject(active.project),
        selectedLayerId: active.selectedLayerId,
        past: [...active.past],
        future: [...active.future],
        hydrated: true,
        editingLayerId: null,
        editingLayerName: "",
      };
    }),

  switchTab: (id) =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === id);
      if (tab === undefined) {
        return state;
      }
      return {
        activeTabId: tab.id,
        project: cloneProject(tab.project),
        selectedLayerId: tab.selectedLayerId,
        past: [...tab.past],
        future: [...tab.future],
        editingLayerId: null,
        editingLayerName: "",
      };
    }),

  createTab: () =>
    set((state) => {
      const nextIndex = state.tabs.length;
      const newTab = createNewTab(nextIndex);
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
        project: cloneProject(newTab.project),
        selectedLayerId: newTab.selectedLayerId,
        past: [],
        future: [],
        editingLayerId: null,
        editingLayerName: "",
      };
    }),

  closeTab: (id) =>
    set((state) => {
      if (state.tabs.length <= 1) {
        // Keep at least one tab — reset it instead
        const fresh = createNewTab(0);
        return {
          tabs: [fresh],
          activeTabId: fresh.id,
          project: fresh.project,
          selectedLayerId: fresh.selectedLayerId,
          past: [],
          future: [],
          editingLayerId: null,
          editingLayerName: "",
        };
      }
      const closingIndex = state.tabs.findIndex((t) => t.id === id);
      if (closingIndex === -1) {
        return state;
      }
      const nextTabs = state.tabs.filter((t) => t.id !== id);
      // If closing active tab, switch to neighbor
      if (state.activeTabId === id) {
        const nextIndex = Math.min(closingIndex, nextTabs.length - 1);
        const nextActive = nextTabs[nextIndex];
        if (nextActive === undefined) {
          return state;
        }
        return {
          tabs: nextTabs,
          activeTabId: nextActive.id,
          project: cloneProject(nextActive.project),
          selectedLayerId: nextActive.selectedLayerId,
          past: [...nextActive.past],
          future: [...nextActive.future],
          editingLayerId: null,
          editingLayerName: "",
        };
      }
      return { tabs: nextTabs };
    }),

  duplicateTab: (id) =>
    set((state) => {
      const source = state.tabs.find((t) => t.id === id);
      if (source === undefined) {
        return state;
      }
      // SAFETY: cloned project inherits valid OgProject shape via structuredClone + parse below
      const clonedProject = {
        ...structuredClone(source.project),
        id: createId("project"),
        name: `${source.project.name} copy`,
      } as OgProject;
      const newTab: TabState = {
        id: clonedProject.id,
        project: projectSchema.parse(clonedProject),
        selectedLayerId: source.selectedLayerId,
        past: [],
        future: [],
      };
      const sourceIndex = state.tabs.findIndex((t) => t.id === id);
      const nextTabs = [...state.tabs];
      nextTabs.splice(sourceIndex + 1, 0, newTab);
      return {
        tabs: nextTabs,
        activeTabId: newTab.id,
        project: cloneProject(newTab.project),
        selectedLayerId: newTab.selectedLayerId,
        past: [],
        future: [],
        editingLayerId: null,
        editingLayerName: "",
      };
    }),

  openProject: (project) =>
    set((state) => {
      // Avoid duplicate tab ids — ensure unique
      const existing = state.tabs.find((t) => t.id === project.id);
      const parsed = projectSchema.parse(project);
      // SAFETY: duplicate id gets regenerated via createId to keep tab keys unique
      const projectToOpen = existing ? ({ ...parsed, id: createId("project") } as OgProject) : parsed;
      const finalProject = existing ? projectSchema.parse(projectToOpen) : parsed;
      const newTab: TabState = {
        id: finalProject.id,
        project: cloneProject(finalProject),
        selectedLayerId: finalProject.layers.at(-1)?.id ?? null,
        past: [],
        future: [],
      };
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
        project: cloneProject(newTab.project),
        selectedLayerId: newTab.selectedLayerId,
        past: [],
        future: [],
        editingLayerId: null,
        editingLayerName: "",
      };
    }),

  selectLayer: (id) =>
    set((state) =>
      withActiveTab(state, (tab) => ({
        ...tab,
        selectedLayerId: id,
      })),
    ),

  updateProjectName: (name) =>
    set((state) =>
      withActiveTab(state, (tab) => {
        const nextProject = { ...tab.project, name: name || "Untitled canvas" };
        return commitProject(tab, projectSchema.parse(nextProject), tab.selectedLayerId);
      }),
    ),

  updateLayer: (id, patch) =>
    set((state) =>
      withActiveTab(state, (tab) => commitProject(tab, replaceLayer(tab.project, id, patch))),
    ),

  addTextLayer: () =>
    set((state) =>
      withActiveTab(state, (tab) => {
        const id = createId("text");
        const layer: Layer = {
          id,
          type: "text",
          name: "New text",
          visible: true,
          locked: false,
          x: 160,
          y: 180,
          width: 520,
          height: 80,
          rotation: 0,
          opacity: 1,
          text: "New text",
          fontFamily: "Pretendard",
          fontSize: 56,
          fontWeight: 600,
          fill: "#2f302c",
          textAlign: "left",
        };
        return commitProject(
          tab,
          { ...tab.project, layers: [...tab.project.layers, layer] },
          id,
        );
      }),
    ),

  addGeometryLayer: () =>
    set((state) =>
      withActiveTab(state, (tab) => {
        const id = createId("geometry");
        const layer: Layer = {
          id,
          type: "shape",
          name: "New shape",
          visible: true,
          locked: false,
          x: 260,
          y: 180,
          width: 180,
          height: 180,
          rotation: 0,
          opacity: 1,
          geometry: "rectangle",
          fill: "#a78bfa",
          cornerRadius: 16,
        };
        return commitProject(
          tab,
          { ...tab.project, layers: [...tab.project.layers, layer] },
          id,
        );
      }),
    ),

  addImageLayer: (asset) =>
    set((state) =>
      withActiveTab(state, (tab) => {
        const id = createId("image");
        const scale = Math.min(720 / asset.width, 420 / asset.height, 1);
        const layer: Layer = {
          id,
          type: "image",
          name: asset.name,
          visible: true,
          locked: false,
          x: (tab.project.width - asset.width * scale) / 2,
          y: (tab.project.height - asset.height * scale) / 2,
          width: asset.width * scale,
          height: asset.height * scale,
          rotation: 0,
          opacity: 1,
          assetId: asset.id,
          fit: "contain",
        };
        return commitProject(
          tab,
          {
            ...tab.project,
            layers: [...tab.project.layers, layer],
            assets: [...tab.project.assets, asset],
          },
          id,
        );
      }),
    ),

  addFont: (font) =>
    set((state) =>
      withActiveTab(state, (tab) =>
        commitProject(tab, {
          ...tab.project,
          fonts: [...tab.project.fonts, font],
        }),
      ),
    ),

  removeSelectedLayer: () =>
    set((state) =>
      withActiveTab(state, (tab) => {
        if (!tab.selectedLayerId) {
          return tab;
        }
        const layer = tab.project.layers.find(({ id }) => id === tab.selectedLayerId);
        if (!layer || layer.locked) {
          return tab;
        }
        const layers = tab.project.layers.filter(({ id }) => id !== tab.selectedLayerId);
        return commitProject(tab, { ...tab.project, layers }, layers.at(-1)?.id ?? null);
      }),
    ),

  duplicateSelectedLayer: () =>
    set((state) =>
      withActiveTab(state, (tab) => {
        if (tab.selectedLayerId === null) {
          return tab;
        }
        const layer = tab.project.layers.find(({ id }) => id === tab.selectedLayerId);
        if (layer === undefined || layer.locked) {
          return tab;
        }
        const cloned: Layer = {
          ...structuredClone(layer),
          id: createId(layer.type),
          name: `${layer.name} copy`,
          x: layer.x + 16,
          y: layer.y + 16,
        };
        return commitProject(
          tab,
          { ...tab.project, layers: [...tab.project.layers, cloned] },
          cloned.id,
        );
      }),
    ),

  removeLayer: (id) =>
    set((state) =>
      withActiveTab(state, (tab) => {
        const layer = tab.project.layers.find((candidate) => candidate.id === id);
        if (layer === undefined || layer.locked) {
          return tab;
        }
        const layers = tab.project.layers.filter((candidate) => candidate.id !== id);
        const nextSelected =
          tab.selectedLayerId === id ? (layers.at(-1)?.id ?? null) : tab.selectedLayerId;
        return commitProject(tab, { ...tab.project, layers }, nextSelected);
      }),
    ),

  duplicateLayer: (id) =>
    set((state) =>
      withActiveTab(state, (tab) => {
        const layer = tab.project.layers.find((candidate) => candidate.id === id);
        if (layer === undefined || layer.locked) {
          return tab;
        }
        const cloned: Layer = {
          ...structuredClone(layer),
          id: createId(layer.type),
          name: `${layer.name} copy`,
          x: layer.x + 16,
          y: layer.y + 16,
        };
        return commitProject(
          tab,
          { ...tab.project, layers: [...tab.project.layers, cloned] },
          cloned.id,
        );
      }),
    ),

  resetLayer: (id) =>
    set((state) =>
      withActiveTab(state, (tab) => {
        const layer = tab.project.layers.find((candidate) => candidate.id === id);
        if (layer === undefined || layer.locked) {
          return tab;
        }
        const patch: LayerPatch =
          layer.type === "text"
            ? { height: 80, rotation: 0, width: 520, x: 160, y: 180 }
            : { height: layer.height, rotation: 0, width: layer.width, x: layer.x, y: layer.y };
        return commitProject(tab, replaceLayer(tab.project, id, patch), id);
      }),
    ),

  toggleLayerVisibility: (id) =>
    set((state) =>
      withActiveTab(state, (tab) => {
        const layer = tab.project.layers.find((candidate) => candidate.id === id);
        return layer === undefined
          ? tab
          : commitProject(tab, replaceLayer(tab.project, id, { visible: !layer.visible }));
      }),
    ),

  toggleLayerLocked: (id) =>
    set((state) =>
      withActiveTab(state, (tab) => {
        const layer = tab.project.layers.find((candidate) => candidate.id === id);
        return layer === undefined
          ? tab
          : commitProject(tab, replaceLayer(tab.project, id, { locked: !layer.locked }));
      }),
    ),

  moveLayerBefore: (sourceId, targetId) =>
    set((state) =>
      withActiveTab(state, (tab) => {
        if (sourceId === targetId) {
          return tab;
        }
        const layers = [...tab.project.layers];
        const sourceIndex = layers.findIndex(({ id }) => id === sourceId);
        const targetIndex = layers.findIndex(({ id }) => id === targetId);
        if (sourceIndex === -1 || targetIndex === -1) {
          return tab;
        }
        const [source] = layers.splice(sourceIndex, 1);
        if (source === undefined) {
          return tab;
        }
        layers.splice(
          layers.findIndex(({ id }) => id === targetId),
          0,
          source,
        );
        return commitProject(tab, { ...tab.project, layers });
      }),
    ),

  resetProject: () =>
    set((state) =>
      withActiveTab(state, (tab) => {
        const fresh = createInitialProject({ name: tab.project.name });
        // Keep same tab id but refresh project with same id
        const nextProject = { ...fresh, id: tab.project.id, name: tab.project.name };
        return commitProject(tab, projectSchema.parse(nextProject), "headline");
      }),
    ),

  setCanvasSize: (width, height) =>
    set((state) =>
      withActiveTab(state, (tab) => {
        const clampedWidth = Math.max(100, Math.min(8000, Math.round(width)));
        const clampedHeight = Math.max(100, Math.min(8000, Math.round(height)));
        if (clampedWidth === tab.project.width && clampedHeight === tab.project.height) {
          return tab;
        }
        const nextLayers = tab.project.layers.map((layer) =>
          layer.id === "background"
            ? { ...layer, width: clampedWidth, height: clampedHeight, x: 0, y: 0 }
            : layer,
        );
        const nextProject = projectSchema.parse({
          ...tab.project,
          width: clampedWidth,
          height: clampedHeight,
          layers: nextLayers,
        });
        return commitProject(tab, nextProject);
      }),
    ),

  setNotice: (notice) => set({ notice }),

  setBusy: (busy) => set({ busy }),

  setHelpOpen: (isHelpOpen) => set({ isHelpOpen }),

  setHelpHeld: (isHelpHeld) => set({ isHelpHeld }),

  setEditingLayerId: (editingLayerId) => set({ editingLayerId }),

  setEditingLayerName: (editingLayerName) => set({ editingLayerName }),

  startRenamingSelected: () =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === state.activeTabId);
      if (tab === undefined) {
        return state;
      }
      const layer = tab.project.layers.find((l) => l.id === tab.selectedLayerId);
      if (!layer || layer.locked) {
        return state;
      }
      return { editingLayerId: layer.id, editingLayerName: layer.name };
    }),

  commitRename: () =>
    set((state) => {
      if (state.editingLayerId === null) {
        return state;
      }
      const trimmed = state.editingLayerName.trim();
      if (trimmed.length === 0) {
        return { editingLayerId: null, editingLayerName: "" };
      }
      const patch = withActiveTab(state, (tab) => {
        const nextLayers = tab.project.layers.map((l) =>
          l.id === state.editingLayerId ? { ...l, name: trimmed } : l,
        );
        const nextProject = projectSchema.parse({ ...tab.project, layers: nextLayers });
        return commitProject(tab, nextProject);
      });
      return { ...patch, editingLayerId: null, editingLayerName: "" };
    }),

  cancelRename: () => set({ editingLayerId: null, editingLayerName: "" }),

  undo: () =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === state.activeTabId);
      if (tab === undefined) {
        return state;
      }
      const previous = tab.past.at(-1);
      if (previous === undefined) {
        return state;
      }
      const nextTab: TabState = {
        ...tab,
        project: previous,
        selectedLayerId: previous.layers.at(-1)?.id ?? null,
        past: tab.past.slice(0, -1),
        future: [tab.project, ...tab.future],
      };
      const nextTabs = state.tabs.map((t) => (t.id === tab.id ? nextTab : t));
      return {
        tabs: nextTabs,
        project: previous,
        selectedLayerId: previous.layers.at(-1)?.id ?? null,
        past: nextTab.past,
        future: nextTab.future,
      };
    }),

  redo: () =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === state.activeTabId);
      if (tab === undefined) {
        return state;
      }
      const next = tab.future[0];
      if (next === undefined) {
        return state;
      }
      const nextTab: TabState = {
        ...tab,
        project: next,
        selectedLayerId: next.layers.at(-1)?.id ?? null,
        past: [...tab.past, tab.project].slice(-HISTORY_LIMIT),
        future: tab.future.slice(1),
      };
      const nextTabs = state.tabs.map((t) => (t.id === tab.id ? nextTab : t));
      return {
        tabs: nextTabs,
        project: next,
        selectedLayerId: next.layers.at(-1)?.id ?? null,
        past: nextTab.past,
        future: nextTab.future,
      };
    }),
}));
