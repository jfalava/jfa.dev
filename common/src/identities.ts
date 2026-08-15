import { z } from "zod";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
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

export type ListIdentity = z.infer<typeof listIdentitySchema>;
export type IdentityAuth = z.infer<typeof identityAuthSchema>;
export type PublishAuth = z.infer<typeof publishAuthSchema>;
export type DeviceProfile = z.infer<typeof deviceProfileSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
