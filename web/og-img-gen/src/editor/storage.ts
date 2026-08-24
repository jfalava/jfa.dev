import DexieDatabase, { type EntityTable } from "dexie";

import {
  createId,
  fontMetaSchema,
  projectSchema,
  type AssetMeta,
  type FontMeta,
  type OgProject,
} from "@/editor/model";

const PROJECT_ID = "local-project";
const IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);
const IMAGE_EXTENSION_MIME_TYPES = new Map([
  ["avif", "image/avif"],
  ["gif", "image/gif"],
  ["jpeg", "image/jpeg"],
  ["jpg", "image/jpeg"],
  ["png", "image/png"],
  ["svg", "image/svg+xml"],
  ["webp", "image/webp"],
]);

export const IMAGE_FILE_ACCEPT =
  "image/avif,image/gif,image/jpeg,image/png,image/svg+xml,image/webp,.avif,.gif,.jpeg,.jpg,.png,.svg,.webp";
const FONT_MIME_TYPES = new Set([
  "application/font-sfnt",
  "font/otf",
  "font/ttf",
  "font/woff",
  "font/woff2",
]);
const FONT_EXTENSION_MIME_TYPES = new Map([
  ["otf", "font/otf"],
  ["ttf", "font/ttf"],
  ["woff", "font/woff"],
  ["woff2", "font/woff2"],
]);

export const FONT_FILE_ACCEPT = "font/otf,font/ttf,font/woff,font/woff2,.otf,.ttf,.woff,.woff2";

interface ProjectRecord {
  id: string;
  project: OgProject;
  updatedAt: number;
}

export interface StoredAsset extends AssetMeta {
  blob: Blob;
  createdAt: number;
}

export interface StoredFont extends FontMeta {
  blob: Blob;
  createdAt: number;
}

class EditorDatabase extends DexieDatabase {
  projects!: EntityTable<ProjectRecord, "id">;
  assets!: EntityTable<StoredAsset, "id">;
  fonts!: EntityTable<StoredFont, "id">;

  constructor() {
    super("og-img-gen");
    this.version(1).stores({
      projects: "id, updatedAt",
      assets: "id, createdAt",
    });
    this.version(2).stores({
      projects: "id, updatedAt",
      assets: "id, createdAt",
      fonts: "id, createdAt",
    });
  }
}

export const editorDatabase = new EditorDatabase();

function mimeTypeFromFileName(name: string): string | null {
  const extension = name.split(".").at(-1)?.toLowerCase();
  return extension === undefined ? null : (IMAGE_EXTENSION_MIME_TYPES.get(extension) ?? null);
}

function imageMimeType(file: File): string | null {
  const fileType = file.type.toLowerCase();
  if (fileType.startsWith("image/")) {
    return fileType;
  }
  return mimeTypeFromFileName(file.name);
}

function fontMimeType(file: File): string | null {
  const fileType = file.type.toLowerCase();
  if (FONT_MIME_TYPES.has(fileType)) {
    return fileType;
  }
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  return extension === undefined ? null : (FONT_EXTENSION_MIME_TYPES.get(extension) ?? null);
}

export function isSupportedFontFile(file: File): boolean {
  return fontMimeType(file) !== null;
}

export interface FontUploadOptions {
  family: string;
  weight: number;
  style: "normal" | "italic";
  variable: boolean;
}

export function createFontMeta(file: File, options: FontUploadOptions): FontMeta {
  const mime = fontMimeType(file);
  if (mime === null) {
    throw new Error("Choose a WOFF2, WOFF, TTF, or OTF font file.");
  }

  return fontMetaSchema.parse({
    ...options,
    id: createId("font"),
    mime,
    name: file.name || "Untitled font",
  });
}

export function isSupportedImageFile(file: File): boolean {
  const mimeType = imageMimeType(file);
  return mimeType !== null && IMAGE_MIME_TYPES.has(mimeType);
}

async function readImageDimensions(file: File): Promise<{ height: number; width: number }> {
  try {
    const bitmap = await globalThis.createImageBitmap?.(file);
    if (bitmap !== undefined) {
      const dimensions = { height: bitmap.height, width: bitmap.width };
      bitmap.close();
      return dimensions;
    }
  } catch {
    // Some browsers cannot create an ImageBitmap from SVG files. The image element fallback
    // below handles those files and still keeps the source entirely local.
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.addEventListener("load", () => resolve(element), { once: true });
      element.addEventListener(
        "error",
        () => reject(new Error("The image could not be decoded.")),
        { once: true },
      );
      element.src = url;
    });
    return { height: image.naturalHeight, width: image.naturalWidth };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadProject(): Promise<OgProject | null> {
  const record = await editorDatabase.projects.get(PROJECT_ID);
  return record === undefined ? null : projectSchema.parse(record.project);
}

export async function saveProject(project: OgProject): Promise<void> {
  await editorDatabase.projects.put({
    id: project.id,
    project,
    updatedAt: Date.now(),
  });
  // Keep legacy single-key for migration cleanup — not removed immediately
  if (project.id !== PROJECT_ID) {
    await editorDatabase.projects.put({
      id: PROJECT_ID,
      project,
      updatedAt: Date.now(),
    });
  }
}

// Tabs persistence — Krita-style multiple canvases in one session
export const TABS_META_KEY = "og-img-gen:tabs-meta";

export interface TabsMeta {
  tabIds: string[];
  activeTabId: string;
}

export function loadTabsMeta(): TabsMeta | null {
  try {
    const raw = globalThis.localStorage?.getItem(TABS_META_KEY);
    if (!raw) {
      return null;
    }
    // SAFETY: parsed TabsMeta is validated via array/string checks below before use
    const parsed = JSON.parse(raw) as TabsMeta;
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- TabsMeta is persisted JSON; runtime validation is the parse boundary
    if (!Array.isArray(parsed.tabIds) || typeof parsed.activeTabId !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveTabsMeta(meta: TabsMeta): void {
  try {
    globalThis.localStorage?.setItem(TABS_META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore quota errors — tabs will still live in memory
  }
}

export async function loadAllProjects(): Promise<OgProject[]> {
  const records = await editorDatabase.projects.toArray();
  // Filter out legacy duplicate if we have real tabs
  return records.map((r) => projectSchema.parse(r.project));
}

export async function saveAllProjects(projects: readonly OgProject[]): Promise<void> {
  await editorDatabase.transaction("rw", editorDatabase.projects, async () => {
    for (const project of projects) {
      await editorDatabase.projects.put({
        id: project.id,
        project,
        updatedAt: Date.now(),
      });
    }
  });
}

export async function deleteProjectById(projectId: string): Promise<void> {
  await editorDatabase.projects.delete(projectId);
}

export async function deleteUnusedAssetsForAll(projects: readonly OgProject[]): Promise<void> {
  const usedAssetIds = new Set(
    projects.flatMap((p) => p.layers.flatMap((layer) => (layer.type === "image" ? [layer.assetId] : []))),
  );
  const allAssets = await editorDatabase.assets.toArray();
  const unusedIds = allAssets.filter((asset) => !usedAssetIds.has(asset.id)).map((asset) => asset.id);
  if (unusedIds.length > 0) {
    await editorDatabase.assets.bulkDelete(unusedIds);
  }
}

export async function deleteUnusedFontsForAll(projects: readonly OgProject[]): Promise<void> {
  const usedFontIds = new Set(projects.flatMap((p) => p.fonts.map((font) => font.id)));
  const allFonts = await editorDatabase.fonts.toArray();
  const unusedIds = allFonts.filter((font) => !usedFontIds.has(font.id)).map((font) => font.id);
  if (unusedIds.length > 0) {
    await editorDatabase.fonts.bulkDelete(unusedIds);
  }
}

export async function saveImageAsset(file: File): Promise<AssetMeta> {
  if (!isSupportedImageFile(file)) {
    throw new Error("Choose a PNG, JPEG, WebP, GIF, AVIF, or SVG image.");
  }

  const { height, width } = await readImageDimensions(file);
  if (width <= 0 || height <= 0) {
    throw new Error("The image has no usable dimensions.");
  }

  const asset: StoredAsset = {
    id: `asset-${crypto.randomUUID()}`,
    name: file.name || "Untitled image",
    mime: imageMimeType(file) ?? "image/png",
    width,
    height,
    blob: file,
    createdAt: Date.now(),
  };
  await editorDatabase.assets.put(asset);
  return {
    id: asset.id,
    name: asset.name,
    mime: asset.mime,
    width: asset.width,
    height: asset.height,
  };
}

export async function loadAssetUrl(assetId: string): Promise<string | null> {
  const asset = await editorDatabase.assets.get(assetId);
  return asset === undefined ? null : URL.createObjectURL(asset.blob);
}

export async function loadAsset(assetId: string): Promise<StoredAsset | null> {
  return (await editorDatabase.assets.get(assetId)) ?? null;
}

export async function saveFontAsset(file: File, font: FontMeta): Promise<void> {
  if (!isSupportedFontFile(file)) {
    throw new Error("Choose a WOFF2, WOFF, TTF, or OTF font file.");
  }
  await editorDatabase.fonts.put({
    ...fontMetaSchema.parse(font),
    blob: file,
    createdAt: Date.now(),
  });
}

export async function loadFont(fontId: string): Promise<StoredFont | null> {
  return (await editorDatabase.fonts.get(fontId)) ?? null;
}

export async function deleteUnusedFonts(project: OgProject): Promise<void> {
  const usedFontIds = new Set(project.fonts.map((font) => font.id));
  const allFonts = await editorDatabase.fonts.toArray();
  const unusedIds = allFonts.filter((font) => !usedFontIds.has(font.id)).map((font) => font.id);
  if (unusedIds.length > 0) {
    await editorDatabase.fonts.bulkDelete(unusedIds);
  }
}

export async function deleteUnusedAssets(project: OgProject): Promise<void> {
  const usedAssetIds = new Set(
    project.layers.flatMap((layer) => (layer.type === "image" ? [layer.assetId] : [])),
  );
  const allAssets = await editorDatabase.assets.toArray();
  const unusedIds = allAssets
    .filter((asset) => !usedAssetIds.has(asset.id))
    .map((asset) => asset.id);
  if (unusedIds.length > 0) {
    await editorDatabase.assets.bulkDelete(unusedIds);
  }
}
