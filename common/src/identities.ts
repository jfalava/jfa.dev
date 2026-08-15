import { z } from "zod";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const PASSKEY_BASE64URL_PATTERN = /^[A-Za-z0-9_-]+=*$/;
const IDENTITY_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const identityIdSchema = z
  .string()
  .regex(IDENTITY_ID_PATTERN, "Expected a SHA-256 identity fingerprint");

// Keweke stores Ed25519 public keys as base64url-encoded SPKI bytes.
export const publicKeySchema = z
  .string()
  .regex(BASE64URL_PATTERN, "Expected a base64url public key")
  .min(20)
  .max(256);

export const signatureSchema = z
  .string()
  .regex(BASE64URL_PATTERN, "Expected a base64url signature")
  .min(20)
  .max(256);

export const usernameSchema = z.string().trim().min(1).max(48);

export const listIdentityIdSchema = identityIdSchema;

export const listIdentitySchema = z.object({
  id: identityIdSchema,
  username: usernameSchema.nullable(),
});

export const identityAuthSchema = z.object({
  userId: identityIdSchema,
  deviceId: identityIdSchema,
  signature: signatureSchema,
});

export const publishAuthSchema = identityAuthSchema.extend({
  userPublicKey: publicKeySchema,
  devicePublicKey: publicKeySchema,
  username: usernameSchema,
});

export const deviceProfileSchema = z.object({
  deviceId: identityIdSchema,
  publicKey: publicKeySchema,
  approvedAt: z.string().datetime({ offset: true }),
  approvedBy: identityIdSchema.nullable(),
  revokedAt: z.string().datetime({ offset: true }).nullable(),
});

export const userProfileSchema = z.object({
  userId: identityIdSchema,
  userPublicKey: publicKeySchema,
  username: usernameSchema,
  devices: z.array(deviceProfileSchema),
});

export const pairingCodeSchema = z
  .string()
  .regex(/^[A-Za-z0-9]{10}$/, "Expected a ten-character pairing code");

const passkeyBase64UrlSchema = z
  .string()
  .regex(PASSKEY_BASE64URL_PATTERN, "Expected a base64url WebAuthn value")
  .min(1)
  .max(2048);

export const passkeySessionIdSchema = z.string().uuid();
export const passkeyCredentialIdSchema = passkeyBase64UrlSchema;

export const passkeyTransportSchema = z.enum([
  "usb",
  "nfc",
  "ble",
  "internal",
  "hybrid",
  "smart-card",
]);

export const passkeyAlgorithmSchema = z.enum(["ES256", "RS256"]);

const passkeyUserSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  displayName: z.string().min(1).max(128),
});

const passkeyClientExtensionResultsSchema = z
  .record(z.string(), z.unknown())
  .default({});

export const passkeyRegistrationSchema = z.object({
  id: passkeyCredentialIdSchema,
  rawId: passkeyCredentialIdSchema,
  response: z.object({
    attestationObject: passkeyBase64UrlSchema,
    authenticatorData: passkeyBase64UrlSchema,
    clientDataJSON: passkeyBase64UrlSchema,
    transports: z.array(passkeyTransportSchema).default([]),
    publicKey: passkeyBase64UrlSchema,
    publicKeyAlgorithm: z.number().int(),
  }),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).nullable().optional(),
  clientExtensionResults: passkeyClientExtensionResultsSchema,
  type: z.literal("public-key"),
  user: passkeyUserSchema,
});

export const passkeyAuthenticationSchema = z.object({
  id: passkeyCredentialIdSchema,
  rawId: passkeyCredentialIdSchema,
  response: z.object({
    authenticatorData: passkeyBase64UrlSchema,
    clientDataJSON: passkeyBase64UrlSchema,
    signature: passkeyBase64UrlSchema,
    userHandle: passkeyBase64UrlSchema.optional(),
  }),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).nullable().optional(),
  clientExtensionResults: passkeyClientExtensionResultsSchema,
  type: z.literal("public-key"),
});

export const passkeyCredentialSchema = z.object({
  id: passkeyCredentialIdSchema,
  publicKey: passkeyBase64UrlSchema,
  algorithm: passkeyAlgorithmSchema,
  transports: z.array(passkeyTransportSchema),
  counter: z.number().int().nonnegative(),
  synced: z.boolean(),
});

export const passkeyProfileSchema = z.object({
  id: passkeyCredentialIdSchema,
  transports: z.array(passkeyTransportSchema),
  synced: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  lastUsedAt: z.string().datetime({ offset: true }).nullable(),
});

export type ListIdentity = z.infer<typeof listIdentitySchema>;
export type IdentityAuth = z.infer<typeof identityAuthSchema>;
export type PublishAuth = z.infer<typeof publishAuthSchema>;
export type DeviceProfile = z.infer<typeof deviceProfileSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type PasskeyRegistration = z.infer<typeof passkeyRegistrationSchema>;
export type PasskeyAuthentication = z.infer<typeof passkeyAuthenticationSchema>;
export type PasskeyCredential = z.infer<typeof passkeyCredentialSchema>;
export type PasskeyProfile = z.infer<typeof passkeyProfileSchema>;
