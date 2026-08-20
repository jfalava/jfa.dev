import type { FontMeta } from "@/editor/model";
import type { StoredFont } from "@/editor/storage";

const registeredFontIds = new Set<string>();

function fontFaceDescriptors(font: FontMeta): FontFaceDescriptors {
  return {
    style: font.style,
    weight: font.variable ? "100 900" : String(font.weight),
  };
}

async function registerFontSource(font: FontMeta, source: ArrayBuffer): Promise<void> {
  const fontFace = new FontFace(font.family, source, fontFaceDescriptors(font));
  await fontFace.load();
  document.fonts.add(fontFace);
}

export async function registerFontFile(font: FontMeta, file: Blob): Promise<void> {
  await registerFontSource(font, await file.arrayBuffer());
}

export async function registerStoredFont(font: StoredFont): Promise<void> {
  if (registeredFontIds.has(font.id)) {
    return;
  }

  await registerFontFile(font, font.blob);
  registeredFontIds.add(font.id);
}
