import DexieDatabase, { type EntityTable } from "dexie";

import { projectSchema, type AssetMeta, type OgProject } from "@/editor/model";

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

interface ProjectRecord {
  id: string;
  project: OgProject;
  updatedAt: number;
}

export interface StoredAsset extends AssetMeta {
  blob: Blob;
  createdAt: number;
}

class EditorDatabase extends DexieDatabase {
  projects!: EntityTable<ProjectRecord, "id">;
  assets!: EntityTable<StoredAsset, "id">;

  constructor() {
    super("og-img-gen");
    this.version(1).stores({
      projects: "id, updatedAt",
      assets: "id, createdAt",
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
    id: PROJECT_ID,
    project,
    updatedAt: Date.now(),
  });
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
