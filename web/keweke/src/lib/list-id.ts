import { isListAlias, normalizeListAlias } from "@jfa.dev/common/aliases";

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidV7(value: string): boolean {
  return UUID_V7_PATTERN.test(value.trim());
}

export function normalizeListId(value: string): string {
  return value.trim().toLowerCase();
}

export function isListAddress(value: string): boolean {
  const normalized = value.trim();
  return isUuidV7(normalized) || isListAlias(normalized);
}

export function normalizeListAddress(value: string): string {
  const normalized = value.trim().toLowerCase();
  return isUuidV7(normalized) ? normalized : normalizeListAlias(normalized);
}
