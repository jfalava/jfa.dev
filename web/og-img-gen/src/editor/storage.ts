import DexieDatabase, { type EntityTable } from "dexie";

import { projectSchema, type AssetMeta, type OgProject } from "@/editor/model";

const PROJECT_ID = "local-project";

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
  const bitmap = await createImageBitmap(file);
  const asset: StoredAsset = {
    id: `asset-${crypto.randomUUID()}`,
    name: file.name || "Untitled image",
    mime: file.type || "image/png",
    width: bitmap.width,
    height: bitmap.height,
    blob: file,
    createdAt: Date.now(),
  };
  bitmap.close();
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
