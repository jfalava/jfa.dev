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

interface EditorState {
  project: OgProject;
  selectedLayerId: string | null;
  past: OgProject[];
  future: OgProject[];
  hydrated: boolean;
  hydrate: (project: OgProject) => void;
  selectLayer: (id: string | null) => void;
  updateProjectName: (name: string) => void;
  updateLayer: (id: string, patch: LayerPatch) => void;
  addTextLayer: () => void;
  addGeometryLayer: () => void;
  addImageLayer: (asset: AssetMeta) => void;
  addFont: (font: FontMeta) => void;
  removeSelectedLayer: () => void;
  duplicateSelectedLayer: () => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLocked: (id: string) => void;
  moveLayerBefore: (sourceId: string, targetId: string) => void;
  resetProject: () => void;
  undo: () => void;
  redo: () => void;
}

function cloneProject(project: OgProject): OgProject {
  return structuredClone(project);
}

function commitProject(
  state: EditorState,
  nextProject: OgProject,
  selectedLayerId = state.selectedLayerId,
): Partial<EditorState> {
  return {
    project: nextProject,
    selectedLayerId,
    past: [...state.past, state.project].slice(-HISTORY_LIMIT),
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

export const useEditorStore = create<EditorState>((set) => ({
  project: createInitialProject(),
  selectedLayerId: "headline",
  past: [],
  future: [],
  hydrated: false,

  hydrate: (project) =>
    set({
      project: cloneProject(project),
      selectedLayerId: project.layers.at(-1)?.id ?? null,
      past: [],
      future: [],
      hydrated: true,
    }),

  selectLayer: (id) => set({ selectedLayerId: id }),

  updateProjectName: (name) =>
    set((state) => commitProject(state, { ...state.project, name: name || "Untitled canvas" })),

  updateLayer: (id, patch) =>
    set((state) => commitProject(state, replaceLayer(state.project, id, patch))),

  addTextLayer: () =>
    set((state) => {
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
        state,
        { ...state.project, layers: [...state.project.layers, layer] },
        id,
      );
    }),

  addGeometryLayer: () =>
    set((state) => {
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
        state,
        { ...state.project, layers: [...state.project.layers, layer] },
        id,
      );
    }),

  addImageLayer: (asset) =>
    set((state) => {
      const id = createId("image");
      const scale = Math.min(720 / asset.width, 420 / asset.height, 1);
      const layer: Layer = {
        id,
        type: "image",
        name: asset.name,
        visible: true,
        locked: false,
        x: (state.project.width - asset.width * scale) / 2,
        y: (state.project.height - asset.height * scale) / 2,
        width: asset.width * scale,
        height: asset.height * scale,
        rotation: 0,
        opacity: 1,
        assetId: asset.id,
        fit: "contain",
      };
      return commitProject(
        state,
        {
          ...state.project,
          layers: [...state.project.layers, layer],
          assets: [...state.project.assets, asset],
        },
        id,
      );
    }),

  addFont: (font) =>
    set((state) =>
      commitProject(state, {
        ...state.project,
        fonts: [...state.project.fonts, font],
      }),
    ),

  removeSelectedLayer: () =>
    set((state) => {
      if (!state.selectedLayerId) {
        return state;
      }
      const layer = state.project.layers.find(({ id }) => id === state.selectedLayerId);
      if (!layer || layer.locked) {
        return state;
      }
      const layers = state.project.layers.filter(({ id }) => id !== state.selectedLayerId);
      return commitProject(state, { ...state.project, layers }, layers.at(-1)?.id ?? null);
    }),

  duplicateSelectedLayer: () =>
    set((state) => {
      if (state.selectedLayerId === null) {
        return state;
      }
      const layer = state.project.layers.find(({ id }) => id === state.selectedLayerId);
      if (layer === undefined || layer.locked) {
        return state;
      }
      const cloned: Layer = {
        ...structuredClone(layer),
        id: createId(layer.type),
        name: `${layer.name} copy`,
        x: layer.x + 16,
        y: layer.y + 16,
      };
      return commitProject(
        state,
        { ...state.project, layers: [...state.project.layers, cloned] },
        cloned.id,
      );
    }),

  toggleLayerVisibility: (id) =>
    set((state) => {
      const layer = state.project.layers.find((candidate) => candidate.id === id);
      return layer === undefined
        ? state
        : commitProject(state, replaceLayer(state.project, id, { visible: !layer.visible }));
    }),

  toggleLayerLocked: (id) =>
    set((state) => {
      const layer = state.project.layers.find((candidate) => candidate.id === id);
      return layer === undefined
        ? state
        : commitProject(state, replaceLayer(state.project, id, { locked: !layer.locked }));
    }),

  moveLayerBefore: (sourceId, targetId) =>
    set((state) => {
      if (sourceId === targetId) {
        return state;
      }
      const layers = [...state.project.layers];
      const sourceIndex = layers.findIndex(({ id }) => id === sourceId);
      const targetIndex = layers.findIndex(({ id }) => id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return state;
      }
      const [source] = layers.splice(sourceIndex, 1);
      if (source === undefined) {
        return state;
      }
      layers.splice(
        layers.findIndex(({ id }) => id === targetId),
        0,
        source,
      );
      return commitProject(state, { ...state.project, layers });
    }),

  resetProject: () => {
    const project = createInitialProject();
    set((state) => commitProject(state, project, "headline"));
  },

  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (previous === undefined) {
        return state;
      }
      return {
        project: previous,
        selectedLayerId: previous.layers.at(-1)?.id ?? null,
        past: state.past.slice(0, -1),
        future: [state.project, ...state.future],
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (next === undefined) {
        return state;
      }
      return {
        project: next,
        selectedLayerId: next.layers.at(-1)?.id ?? null,
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
      };
    }),
}));
