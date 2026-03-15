import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DEFAULT_FONTS,
  type Template,
  type EditorElement,
  type ElementType,
  type TextContent,
  type ImageContent,
  type BadgeContent,
  type ContainerContent,
  type TemplateVariable,
  type Font,
} from "@/types/editor";

interface PersistedEditorState {
  templates?: Template[];
  fonts?: Array<
    | Font
    | { family: string; source: string; weights: number[]; loaded: boolean; stylesheetUrl?: string }
  >;
  gridEnabled?: boolean;
  gridSize?: number;
  showGrid?: boolean;
}

function normalizeFonts(fonts: PersistedEditorState["fonts"] | undefined): Font[] {
  if (!Array.isArray(fonts)) {
    return [];
  }

  return fonts
    .filter(
      (
        font,
      ): font is {
        family: string;
        source: string;
        weights: number[];
        loaded: boolean;
        stylesheetUrl?: string;
      } =>
        typeof font === "object" &&
        font !== null &&
        typeof font.family === "string" &&
        Array.isArray(font.weights) &&
        typeof font.loaded === "boolean" &&
        (font.source === "google" || font.source === "external"),
    )
    .map((font) => ({
      family: font.family,
      source: font.source === "external" ? "external" : "google",
      weights: font.weights.filter((weight): weight is number => typeof weight === "number"),
      loaded: font.loaded,
      stylesheetUrl: typeof font.stylesheetUrl === "string" ? font.stylesheetUrl : undefined,
    }));
}

interface EditorState {
  templates: Template[];
  currentTemplateId: string | null;
  selectedElementId: string | null;
  fonts: Font[];
  variableValues: Record<string, string>;
  zoom: number;
  gridEnabled: boolean;
  gridSize: number;
  showGrid: boolean;

  // Template actions
  createTemplate: (name: string, description?: string) => string;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => string;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  setCurrentTemplate: (id: string | null) => void;
  importTemplate: (template: Template) => void;
  exportTemplate: (id: string) => Template | null;

  // Element actions
  addElement: (type: ElementType) => void;
  deleteElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  selectElement: (id: string | null) => void;
  duplicateElement: (id: string) => void;
  moveElement: (id: string, position: { x: number; y: number }) => void;
  resizeElement: (id: string, size: { width: number; height: number }) => void;
  reorderElement: (id: string, direction: "up" | "down") => void;

  // Variable actions
  addVariable: (variable: TemplateVariable) => void;
  removeVariable: (key: string) => void;
  updateVariable: (key: string, updates: Partial<TemplateVariable>) => void;
  setVariableValue: (key: string, value: string) => void;

  // Font actions
  addGoogleFont: (family: string, weights: number[]) => void;
  addExternalFont: (family: string, stylesheetUrl: string) => void;
  setFontLoaded: (family: string, loaded: boolean) => void;

  // View actions
  setZoom: (zoom: number) => void;

  // Grid actions
  setGridEnabled: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  setShowGrid: (show: boolean) => void;
  snapToGrid: (value: number) => number;
}

function createDefaultTextContent(): TextContent {
  return {
    type: "text",
    text: "New Text",
    fontFamily: "Manrope",
    fontSize: 32,
    fontWeight: 500,
    lineHeight: 1.2,
    textAlign: "left",
    color: "#ffffff",
  };
}

function createDefaultImageContent(): ImageContent {
  return {
    type: "image",
    src: "",
    objectFit: "cover",
    borderRadius: 0,
  };
}

function createDefaultBadgeContent(): BadgeContent {
  return {
    type: "badge",
    text: "Badge",
    fontFamily: "Manrope",
    fontSize: 16,
    fontWeight: 500,
    backgroundColor: "rgba(59, 130, 246, 0.9)",
    textColor: "#ffffff",
    borderColor: "rgba(59, 130, 246, 1)",
    borderRadius: 8,
    paddingX: 14,
    paddingY: 6,
  };
}

function createDefaultContainerContent(): ContainerContent {
  return {
    type: "container",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderColor: "transparent",
    borderWidth: 0,
    borderRadius: 0,
    opacity: 1,
  };
}

function createDefaultElement(type: ElementType): EditorElement {
  const id = nanoid();
  const base = {
    id,
    type,
    position: { x: 100, y: 100 },
    tailwindClasses: "",
    locked: false,
    visible: true,
  };

  switch (type) {
    case "text":
      return {
        ...base,
        size: { width: 400, height: 60 },
        content: createDefaultTextContent(),
      };
    case "image":
      return {
        ...base,
        size: { width: 300, height: 200 },
        content: createDefaultImageContent(),
      };
    case "badge":
      return {
        ...base,
        size: { width: 120, height: 40 },
        content: createDefaultBadgeContent(),
      };
    case "container":
      return {
        ...base,
        size: { width: 400, height: 300 },
        content: createDefaultContainerContent(),
      };
  }
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      templates: [],
      currentTemplateId: null,
      selectedElementId: null,
      fonts: DEFAULT_FONTS,
      variableValues: {},
      zoom: 1,
      gridEnabled: true,
      gridSize: 24,
      showGrid: true,

      createTemplate: (name, description = "") => {
        const id = nanoid();
        const template: Template = {
          id,
          name,
          description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          elements: [],
          canvasBackground: "linear-gradient(135deg, hsl(0 0% 0%), hsl(0 0% 7%))",
          variables: [],
        };
        set((state) => ({
          templates: [...state.templates, template],
          currentTemplateId: id,
        }));
        return id;
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          currentTemplateId: state.currentTemplateId === id ? null : state.currentTemplateId,
        }));
      },

      duplicateTemplate: (id) => {
        const template = get().templates.find((t) => t.id === id);
        if (!template) {
          return "";
        }
        const newId = nanoid();
        const duplicate: Template = {
          ...template,
          id: newId,
          name: `${template.name} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          elements: template.elements.map((el) => ({ ...el, id: nanoid() })),
        };
        set((state) => ({
          templates: [...state.templates, duplicate],
        }));
        return newId;
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
          ),
        }));
      },

      setCurrentTemplate: (id) => {
        set({ currentTemplateId: id, selectedElementId: null });
      },

      importTemplate: (template) => {
        const id = nanoid();
        const imported: Template = {
          ...template,
          id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          elements: template.elements.map((el) => ({ ...el, id: nanoid() })),
        };
        set((state) => ({
          templates: [...state.templates, imported],
          currentTemplateId: id,
        }));
      },

      exportTemplate: (id) => {
        return get().templates.find((t) => t.id === id) || null;
      },

      addElement: (type) => {
        const currentId = get().currentTemplateId;
        if (!currentId) {
          return;
        }
        const element = createDefaultElement(type);
        const { gridEnabled, gridSize } = get();
        if (gridEnabled) {
          element.position.x = Math.round(element.position.x / gridSize) * gridSize;
          element.position.y = Math.round(element.position.y / gridSize) * gridSize;
        }
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === currentId
              ? { ...t, elements: [...t.elements, element], updatedAt: new Date().toISOString() }
              : t,
          ),
          selectedElementId: element.id,
        }));
      },

      deleteElement: (id) => {
        const currentId = get().currentTemplateId;
        if (!currentId) {
          return;
        }
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === currentId
              ? {
                  ...t,
                  elements: t.elements.filter((el) => el.id !== id),
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
          selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
        }));
      },

      updateElement: (id, updates) => {
        const currentId = get().currentTemplateId;
        if (!currentId) {
          return;
        }
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === currentId
              ? {
                  ...t,
                  elements: t.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        }));
      },

      selectElement: (id) => {
        set({ selectedElementId: id });
      },

      duplicateElement: (id) => {
        const currentId = get().currentTemplateId;
        if (!currentId) {
          return;
        }
        const template = get().templates.find((t) => t.id === currentId);
        const element = template?.elements.find((el) => el.id === id);
        if (!element) {
          return;
        }
        const duplicate: EditorElement = {
          ...element,
          id: nanoid(),
          position: { x: element.position.x + 20, y: element.position.y + 20 },
        };
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === currentId
              ? { ...t, elements: [...t.elements, duplicate], updatedAt: new Date().toISOString() }
              : t,
          ),
          selectedElementId: duplicate.id,
        }));
      },

      moveElement: (id, position) => {
        get().updateElement(id, { position });
      },

      resizeElement: (id, size) => {
        get().updateElement(id, { size });
      },

      reorderElement: (id, direction) => {
        const currentId = get().currentTemplateId;
        if (!currentId) {
          return;
        }
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id !== currentId) {
              return t;
            }
            const idx = t.elements.findIndex((el) => el.id === id);
            if (idx === -1) {
              return t;
            }
            const newIdx = direction === "up" ? idx + 1 : idx - 1;
            if (newIdx < 0 || newIdx >= t.elements.length) {
              return t;
            }
            const elements = [...t.elements];
            [elements[idx], elements[newIdx]] = [elements[newIdx], elements[idx]];
            return { ...t, elements, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      addVariable: (variable) => {
        const currentId = get().currentTemplateId;
        if (!currentId) {
          return;
        }
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === currentId
              ? { ...t, variables: [...t.variables, variable], updatedAt: new Date().toISOString() }
              : t,
          ),
          variableValues: { ...state.variableValues, [variable.key]: variable.defaultValue },
        }));
      },

      removeVariable: (key) => {
        const currentId = get().currentTemplateId;
        if (!currentId) {
          return;
        }
        set((state) => {
          const { [key]: _, ...rest } = state.variableValues;
          return {
            templates: state.templates.map((t) =>
              t.id === currentId
                ? {
                    ...t,
                    variables: t.variables.filter((v) => v.key !== key),
                    updatedAt: new Date().toISOString(),
                  }
                : t,
            ),
            variableValues: rest,
          };
        });
      },

      updateVariable: (key, updates) => {
        const currentId = get().currentTemplateId;
        if (!currentId) {
          return;
        }
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === currentId
              ? {
                  ...t,
                  variables: t.variables.map((v) => (v.key === key ? { ...v, ...updates } : v)),
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        }));
      },

      setVariableValue: (key, value) => {
        set((state) => ({
          variableValues: { ...state.variableValues, [key]: value },
        }));
      },

      addGoogleFont: (family, weights) => {
        set((state) => ({
          fonts: [...state.fonts, { family, source: "google", weights, loaded: false }],
        }));
      },
      addExternalFont: (family, stylesheetUrl) => {
        set((state) => ({
          fonts: [
            ...state.fonts,
            {
              family,
              source: "external",
              weights: [],
              loaded: false,
              stylesheetUrl,
            },
          ],
        }));
      },

      setFontLoaded: (family, loaded) => {
        set((state) => ({
          fonts: state.fonts.map((f) => (f.family === family ? { ...f, loaded } : f)),
        }));
      },

      setZoom: (zoom) => {
        set({ zoom: Math.max(0.25, Math.min(2, zoom)) });
      },

      setGridEnabled: (enabled) => {
        set({ gridEnabled: enabled });
      },

      setGridSize: (size) => {
        set({ gridSize: Math.max(8, Math.min(96, size)) });
      },

      setShowGrid: (show) => {
        set({ showGrid: show });
      },

      snapToGrid: (value) => {
        const { gridEnabled, gridSize } = get();
        if (!gridEnabled) {
          return value;
        }
        return Math.round(value / gridSize) * gridSize;
      },
    }),
    {
      name: "og-generator-storage",
      version: 2,
      migrate: (persistedState: unknown): PersistedEditorState => {
        const state =
          typeof persistedState === "object" && persistedState !== null
            ? (persistedState as PersistedEditorState)
            : {};

        return {
          templates: Array.isArray(state.templates) ? state.templates : [],
          fonts: normalizeFonts(state.fonts),
          gridEnabled: state.gridEnabled ?? true,
          gridSize: state.gridSize ?? 24,
          showGrid: state.showGrid ?? true,
        };
      },
      partialize: (state) => ({
        templates: state.templates,
        fonts: state.fonts,
        gridEnabled: state.gridEnabled,
        gridSize: state.gridSize,
        showGrid: state.showGrid,
      }),
    },
  ),
);
