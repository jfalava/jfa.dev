import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import { projectSchema, type OgProject } from "@/editor/model";
import { editorDatabase, loadAsset, loadFont } from "@/editor/storage";

function projectFileName(name: string): string {
  const safeName = name
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  return `${safeName || "untitled-canvas"}.ogproj`;
}

export async function createProjectArchive(project: OgProject): Promise<Blob> {
  const files = new Map<string, Uint8Array>([
    ["project.json", strToU8(JSON.stringify(project, null, 2))],
  ]);

  for (const asset of project.assets) {
    const storedAsset = await loadAsset(asset.id);
    if (storedAsset !== null) {
      files.set(`assets/${asset.id}`, new Uint8Array(await storedAsset.blob.arrayBuffer()));
    }
  }

  for (const font of project.fonts) {
    const storedFont = await loadFont(font.id);
    if (storedFont !== null) {
      files.set(`fonts/${font.id}`, new Uint8Array(await storedFont.blob.arrayBuffer()));
    }
  }

  return new Blob([zipSync(Object.fromEntries(files))], { type: "application/zip" });
}

export function archiveFileName(project: OgProject): string {
  return projectFileName(project.name);
}

export async function readProjectArchive(file: File): Promise<OgProject> {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const projectBytes = archive["project.json"];
  if (projectBytes === undefined) {
    throw new Error("This project archive does not contain project.json.");
  }

  const project = projectSchema.parse(JSON.parse(strFromU8(projectBytes)));
  for (const asset of project.assets) {
    const bytes = archive[`assets/${asset.id}`];
    if (bytes !== undefined) {
      const blob = new Blob([bytes], { type: asset.mime });
      await editorDatabase.assets.put({ ...asset, blob, createdAt: Date.now() });
    }
  }
  for (const font of project.fonts) {
    const bytes = archive[`fonts/${font.id}`];
    if (bytes !== undefined) {
      const blob = new Blob([bytes], { type: font.mime });
      await editorDatabase.fonts.put({ ...font, blob, createdAt: Date.now() });
    }
  }
  return project;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
