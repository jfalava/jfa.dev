import type { ListMutation, ListSnapshot } from "./lists";

const textEncoder = new TextEncoder();
const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function base64UrlEncode(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function sha256(value: string | Uint8Array): Promise<Uint8Array> {
  const bytes = typeof value === "string" ? textEncoder.encode(value) : value;
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

export async function sha256Base64Url(value: string | Uint8Array): Promise<string> {
  return base64UrlEncode(await sha256(value));
}

export async function publicKeyFingerprint(publicKey: string): Promise<string> {
  return sha256Base64Url(base64UrlDecode(publicKey));
}

export async function generateEd25519KeyPair(): Promise<CryptoKeyPair> {
  const generated = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    false,
    ["sign", "verify"],
  );
  if (!("privateKey" in generated)) {
    throw new Error("Ed25519 key generation did not return a key pair");
  }
  return generated;
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  return base64UrlEncode(await crypto.subtle.exportKey("spki", publicKey));
}

export async function signPayload(privateKey: CryptoKey, payload: string): Promise<string> {
  return base64UrlEncode(
    await crypto.subtle.sign("Ed25519", privateKey, textEncoder.encode(payload)),
  );
}

export async function verifyPayload(
  publicKey: string,
  signature: string,
  payload: string,
): Promise<boolean> {
  try {
    const imported = await crypto.subtle.importKey(
      "spki",
      base64UrlDecode(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      "Ed25519",
      imported,
      base64UrlDecode(signature),
      textEncoder.encode(payload),
    );
  } catch {
    return false;
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function canonicalPayload(context: string, value: unknown): string {
  return `${context}:${JSON.stringify(canonicalize(value))}`;
}

export function listMutationSigningPayload(mutation: ListMutation): string {
  return canonicalPayload("keweke:list-mutation:v1", {
    id: mutation.id,
    baseRevision: mutation.baseRevision,
    actor: mutation.actor ?? null,
    auth: mutation.auth
      ? {
          userId: mutation.auth.userId,
          deviceId: mutation.auth.deviceId,
        }
      : null,
    command: mutation.command,
  });
}

export function listPublishSigningPayload(input: {
  listId: string;
  migrationId: string;
  snapshot: ListSnapshot;
  userId: string;
  deviceId: string;
  username: string;
}): string {
  return canonicalPayload("keweke:list-publish:v1", input);
}

export function userRenameSigningPayload(input: {
  userId: string;
  deviceId: string;
  username: string;
}): string {
  return canonicalPayload("keweke:user-rename:v1", input);
}

export function pairingApprovalSigningPayload(input: {
  code: string;
  userId: string;
  approverDeviceId: string;
  targetDeviceId: string;
  targetDevicePublicKey: string;
}): string {
  return canonicalPayload("keweke:pairing-approval:v1", input);
}

export function deviceRevocationSigningPayload(input: {
  userId: string;
  approverDeviceId: string;
  targetDeviceId: string;
}): string {
  return canonicalPayload("keweke:device-revocation:v1", input);
}

export function aliasSigningPayload(input: { listId: string; userId: string; deviceId: string }): string {
  return canonicalPayload("keweke:list-alias:v1", input);
}

export async function generatePairingCode(): Promise<string> {
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  const digest = await sha256(seed);
  return Array.from(digest.slice(0, 10), (byte) => PAIRING_ALPHABET[byte % PAIRING_ALPHABET.length]).join("");
}
