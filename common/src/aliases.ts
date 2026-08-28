import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

const ALIAS_SUFFIX_LENGTH = 5;
const ALIAS_SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const ALIAS_BASE_MAX_LENGTH = 48;

export const listAliasSchema = Schema.String.check(
  Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z]{5}$/),
  Schema.isMaxLength(64),
).pipe(
  Schema.decode({
    decode: SchemaGetter.transform((value: string) => value.toLowerCase()),
    encode: SchemaGetter.transform((value: string) => value),
  }),
);

export function normalizeListAliasBase(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ALIAS_BASE_MAX_LENGTH)
    .replace(/-+$/g, "");

  if (!normalized) {
    throw new Error("Alias needs at least one letter or number");
  }

  return normalized;
}

export function createListAlias(value: string, randomBytes?: Uint8Array): string {
  const bytes = randomBytes ?? createRandomBytes();
  if (bytes.length < ALIAS_SUFFIX_LENGTH) {
    throw new Error("Alias randomness source is too short");
  }

  const suffix = Array.from(
    bytes.slice(0, ALIAS_SUFFIX_LENGTH),
    (byte) => ALIAS_SUFFIX_ALPHABET[byte % ALIAS_SUFFIX_ALPHABET.length],
  ).join("");
  return Schema.decodeUnknownSync(listAliasSchema)(`${normalizeListAliasBase(value)}-${suffix}`);
}

export function isListAlias(value: string): boolean {
  return Schema.is(listAliasSchema)(value.trim().toLowerCase());
}

export function normalizeListAlias(value: string): string {
  return Schema.decodeUnknownSync(listAliasSchema)(value.trim().toLowerCase());
}

function createRandomBytes(): Uint8Array {
  const bytes = new Uint8Array(ALIAS_SUFFIX_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}
