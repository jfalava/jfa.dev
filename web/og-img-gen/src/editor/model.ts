import { z } from "zod";

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 630;

const layerBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
});

const textLayerSchema = layerBaseSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontFamily: z.string().min(1),
  fontSize: z.number().positive(),
  fontWeight: z.number().int().min(100).max(900),
  fill: z.string().min(1),
  textAlign: z.enum(["left", "center", "right"]),
});

const geometryLayerSchema = layerBaseSchema.extend({
  type: z.literal("shape"),
  geometry: z.enum(["rectangle", "circle"]),
  fill: z.string().min(1),
  cornerRadius: z.number().min(0),
});

const imageLayerSchema = layerBaseSchema.extend({
  type: z.literal("image"),
  assetId: z.string().min(1),
  fit: z.enum(["cover", "contain"]),
});

export const layerSchema = z.discriminatedUnion("type", [
  textLayerSchema,
  geometryLayerSchema,
  imageLayerSchema,
]);

export const assetMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mime: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const fontMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  family: z.string().min(1),
  mime: z.string().min(1),
  weight: z.number().int().min(100).max(900),
  style: z.enum(["normal", "italic"]),
  variable: z.boolean(),
});

export const projectSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  background: z.string().min(1),
  layers: z.array(layerSchema),
  assets: z.array(assetMetaSchema),
  fonts: z.array(fontMetaSchema).default([]),
});

export type Layer = z.infer<typeof layerSchema>;
export type TextLayer = z.infer<typeof textLayerSchema>;
export type GeometryLayer = z.infer<typeof geometryLayerSchema>;
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type AssetMeta = z.infer<typeof assetMetaSchema>;
export type FontMeta = z.infer<typeof fontMetaSchema>;
export type OgProject = z.infer<typeof projectSchema>;

export type LayerPatch = Partial<{
  name: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  textAlign: TextLayer["textAlign"];
  geometry: GeometryLayer["geometry"];
  cornerRadius: number;
  fit: ImageLayer["fit"];
}>;

export function createId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${randomId}`;
}

export function createInitialProject(): OgProject {
  return {
    version: 1,
    id: "local-project",
    name: "Untitled canvas",
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    background: "#f5f1ea",
    assets: [],
    fonts: [],
    layers: [
      {
        id: "background",
        type: "shape",
        name: "Background",
        visible: true,
        locked: true,
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        rotation: 0,
        opacity: 1,
        geometry: "rectangle",
        fill: "#f5f1ea",
        cornerRadius: 0,
      },
      {
        id: "accent",
        type: "shape",
        name: "Accent block",
        visible: true,
        locked: false,
        x: 108,
        y: 88,
        width: 190,
        height: 190,
        rotation: 0,
        opacity: 1,
        geometry: "circle",
        fill: "#d6ff48",
        cornerRadius: 0,
      },
      {
        id: "headline",
        type: "text",
        name: "Headline",
        visible: true,
        locked: false,
        x: 108,
        y: 330,
        width: 780,
        height: 150,
        rotation: 0,
        opacity: 1,
        text: "Make it\nunmistakable.",
        fontFamily: "Pretendard",
        fontSize: 88,
        fontWeight: 600,
        fill: "#2f302c",
        textAlign: "left",
      },
      {
        id: "supporting-copy",
        type: "text",
        name: "Supporting copy",
        visible: true,
        locked: false,
        x: 112,
        y: 505,
        width: 500,
        height: 36,
        rotation: 0,
        opacity: 1,
        text: "A visual workspace for the web.",
        fontFamily: "Pretendard",
        fontSize: 22,
        fontWeight: 400,
        fill: "#6e665a",
        textAlign: "left",
      },
    ],
  };
}

export function isTextLayer(layer: Layer | undefined): layer is TextLayer {
  return layer?.type === "text";
}

export function isGeometryLayer(layer: Layer | undefined): layer is GeometryLayer {
  return layer?.type === "shape";
}

export function isImageLayer(layer: Layer | undefined): layer is ImageLayer {
  return layer?.type === "image";
}
