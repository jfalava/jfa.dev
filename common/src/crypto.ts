import type { ListMutation, ListSnapshot } from "./lists";

const textEncoder = new TextEncoder();
const PAIRING_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

type CanonicalPayload = Record<string, CanonicalValue>;

function isCanonicalObject(value: CanonicalValue): value is CanonicalPayload {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function arrayBuffer(value: Uint8Array): ArrayBuffer {
  // SAFETY: Uint8Array.from creates a new ordinary ArrayBuffer, never a SharedArrayBuffer.
  return Uint8Array.from(value).buffer as ArrayBuffer;
}

export function base64UrlEncode(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function sha256(value: string | Uint8Array): Promise<Uint8Array> {
  const bytes = value instanceof Uint8Array ? value : textEncoder.encode(value);
  const input = new Uint8Array(bytes);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", input.buffer));
}

export async function sha256Base64Url(
  value: string | Uint8Array,
): Promise<string> {
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

export async function signPayload(
  privateKey: CryptoKey,
  payload: string,
): Promise<string> {
  const data = textEncoder.encode(payload);
  return base64UrlEncode(
    await crypto.subtle.sign("Ed25519", privateKey, data.buffer),
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
      arrayBuffer(base64UrlDecode(publicKey)),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      "Ed25519",
      imported,
      arrayBuffer(base64UrlDecode(signature)),
      arrayBuffer(textEncoder.encode(payload)),
    );
  } catch {
    return false;
  }
}

function canonicalize(value: CanonicalValue): CanonicalValue {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isCanonicalObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function canonicalPayload(context: string, value: CanonicalPayload): string {
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

export function userListsSigningPayload(input: {
  userId: string;
  deviceId: string;
}): string {
  return canonicalPayload("keweke:user-lists:v1", input);
}

export function userDeleteSigningPayload(input: {
  userId: string;
  deviceId: string;
}): string {
  return canonicalPayload("keweke:user-delete:v1", input);
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

export function passkeyRegistrationStartSigningPayload(input: {
  userId: string;
  deviceId: string;
}): string {
  return canonicalPayload("keweke:passkey-registration-start:v1", input);
}

export function passkeyRegistrationFinishSigningPayload(input: {
  sessionId: string;
  userId: string;
  deviceId: string;
  credentialId: string;
}): string {
  return canonicalPayload("keweke:passkey-registration-finish:v1", input);
}

export function passkeyAdoptionFinishSigningPayload(input: {
  sessionId: string;
  targetDeviceId: string;
  credentialId: string;
}): string {
  return canonicalPayload("keweke:passkey-adoption-finish:v1", input);
}

export function passkeyListSigningPayload(input: {
  userId: string;
  deviceId: string;
}): string {
  return canonicalPayload("keweke:passkey-list:v1", input);
}

export function passkeyDeleteSigningPayload(input: {
  userId: string;
  deviceId: string;
  credentialId: string;
}): string {
  return canonicalPayload("keweke:passkey-delete:v1", input);
}

export function deviceRevocationSigningPayload(input: {
  userId: string;
  approverDeviceId: string;
  targetDeviceId: string;
}): string {
  return canonicalPayload("keweke:device-revocation:v1", input);
}

export function aliasSigningPayload(input: {
  listId: string;
  userId: string;
  deviceId: string;
}): string {
  return canonicalPayload("keweke:list-alias:v1", input);
}

export async function generatePairingCode(): Promise<string> {
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  const digest = await sha256(seed);
  return Array.from(
    digest.slice(0, 10),
    (byte) => PAIRING_ALPHABET[byte % PAIRING_ALPHABET.length],
  ).join("");
}
