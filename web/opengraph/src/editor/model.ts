import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 630;

const nonEmptyString = Schema.String.check(Schema.isMinLength(1));
const positiveNumber = Schema.Number.check(Schema.isGreaterThan(0));

const layerBaseSchema = Schema.Struct({
  id: nonEmptyString,
  name: nonEmptyString,
  visible: Schema.Boolean,
  locked: Schema.Boolean,
  x: Schema.Number,
  y: Schema.Number,
  width: positiveNumber,
  height: positiveNumber,
  rotation: Schema.Number,
  opacity: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0), Schema.isLessThanOrEqualTo(1)),
});

const textLayerSchema = Schema.Struct({
  ...layerBaseSchema.fields,
  type: Schema.Literal("text"),
  text: Schema.String,
  fontFamily: nonEmptyString,
  fontSize: positiveNumber,
  fontWeight: Schema.Int.check(Schema.isGreaterThanOrEqualTo(100), Schema.isLessThanOrEqualTo(900)),
  fill: nonEmptyString,
  textAlign: Schema.Literals(["left", "center", "right"]),
});

const geometryLayerSchema = Schema.Struct({
  ...layerBaseSchema.fields,
  type: Schema.Literal("shape"),
  geometry: Schema.Literals(["rectangle", "circle"]),
  fill: nonEmptyString,
  cornerRadius: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
});

const imageLayerSchema = Schema.Struct({
  ...layerBaseSchema.fields,
  type: Schema.Literal("image"),
  assetId: nonEmptyString,
  fit: Schema.Literals(["cover", "contain"]),
});

export const layerSchema = Schema.Union([textLayerSchema, geometryLayerSchema, imageLayerSchema]);

export const assetMetaSchema = Schema.Struct({
  id: nonEmptyString,
  name: nonEmptyString,
  mime: nonEmptyString,
  width: positiveNumber,
  height: positiveNumber,
});

export const fontMetaSchema = Schema.Struct({
  id: nonEmptyString,
  name: nonEmptyString,
  family: nonEmptyString,
  mime: nonEmptyString,
  weight: Schema.Int.check(Schema.isGreaterThanOrEqualTo(100), Schema.isLessThanOrEqualTo(900)),
  style: Schema.Literals(["normal", "italic"]),
  variable: Schema.Boolean,
});

export const projectSchema = Schema.Struct({
  version: Schema.Literal(1),
  id: nonEmptyString,
  name: nonEmptyString,
  width: positiveNumber,
  height: positiveNumber,
  background: nonEmptyString,
  layers: Schema.Array(layerSchema),
  assets: Schema.Array(assetMetaSchema),
  fonts: Schema.Array(fontMetaSchema).pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
});

export type Layer = Schema.Schema.Type<typeof layerSchema>;
export type TextLayer = Schema.Schema.Type<typeof textLayerSchema>;
export type GeometryLayer = Schema.Schema.Type<typeof geometryLayerSchema>;
export type ImageLayer = Schema.Schema.Type<typeof imageLayerSchema>;
export type AssetMeta = Schema.Schema.Type<typeof assetMetaSchema>;
export type FontMeta = Schema.Schema.Type<typeof fontMetaSchema>;
export type OgProject = Schema.Schema.Type<typeof projectSchema>;

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

export function createInitialProject(options?: { id?: string; name?: string }): OgProject {
  return {
    version: 1,
    id:
      options?.id ??
      `project-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    name: options?.name ?? "Untitled canvas",
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
