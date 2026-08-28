import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const PASSKEY_BASE64URL_PATTERN = /^[A-Za-z0-9_-]+=*$/;
const IDENTITY_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** ISO-8601 datetime string with a `Z` or numeric offset, as produced by `Date.toISOString()`. */
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export const timestampSchema = Schema.String.check(Schema.isPattern(ISO_DATETIME_PATTERN));

export const identityIdSchema = Schema.String.check(Schema.isPattern(IDENTITY_ID_PATTERN));

// Keweke stores Ed25519 public keys as base64url-encoded SPKI bytes.
export const publicKeySchema = Schema.String.check(
  Schema.isPattern(BASE64URL_PATTERN),
  Schema.isMinLength(20),
  Schema.isMaxLength(256),
);

export const signatureSchema = Schema.String.check(
  Schema.isPattern(BASE64URL_PATTERN),
  Schema.isMinLength(20),
  Schema.isMaxLength(256),
);

export const usernameSchema = Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(48));

export const listIdentityIdSchema = identityIdSchema;

export const listIdentitySchema = Schema.Struct({
  id: identityIdSchema,
  username: Schema.NullOr(usernameSchema),
});

const identityAuthFields = {
  userId: identityIdSchema,
  deviceId: identityIdSchema,
  signature: signatureSchema,
};

export const identityAuthSchema = Schema.Struct(identityAuthFields);

export const publishAuthSchema = Schema.Struct({
  ...identityAuthFields,
  userPublicKey: publicKeySchema,
  devicePublicKey: publicKeySchema,
  username: usernameSchema,
});

export const deviceProfileSchema = Schema.Struct({
  deviceId: identityIdSchema,
  publicKey: publicKeySchema,
  approvedAt: timestampSchema,
  approvedBy: Schema.NullOr(identityIdSchema),
  revokedAt: Schema.NullOr(timestampSchema),
});

export const userProfileSchema = Schema.Struct({
  userId: identityIdSchema,
  userPublicKey: publicKeySchema,
  username: usernameSchema,
  devices: Schema.Array(deviceProfileSchema),
});

export const pairingCodeSchema = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9]{10}$/));

const passkeyBase64UrlSchema = Schema.String.check(
  Schema.isPattern(PASSKEY_BASE64URL_PATTERN),
  Schema.isMinLength(1),
  Schema.isMaxLength(2048),
);

export const passkeySessionIdSchema = Schema.String.check(Schema.isUUID());
export const passkeyCredentialIdSchema = passkeyBase64UrlSchema;

export const passkeyTransportSchema = Schema.Literals([
  "usb",
  "nfc",
  "ble",
  "internal",
  "hybrid",
  "smart-card",
]);

export const passkeyAlgorithmSchema = Schema.Literals(["ES256", "RS256"]);

const passkeyUserSchema = Schema.Struct({
  id: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(64)),
  name: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
  displayName: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
});

const passkeyClientExtensionResultsSchema = Schema.Record(Schema.String, Schema.Unknown).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed({})),
);

export const passkeyRegistrationSchema = Schema.Struct({
  id: passkeyCredentialIdSchema,
  rawId: passkeyCredentialIdSchema,
  response: Schema.Struct({
    attestationObject: passkeyBase64UrlSchema,
    authenticatorData: passkeyBase64UrlSchema,
    clientDataJSON: passkeyBase64UrlSchema,
    transports: Schema.Array(passkeyTransportSchema).pipe(
      Schema.withDecodingDefaultKey(Effect.succeed([])),
    ),
    publicKey: passkeyBase64UrlSchema,
    publicKeyAlgorithm: Schema.Int,
  }),
  authenticatorAttachment: Schema.optional(
    Schema.NullishOr(Schema.Literals(["platform", "cross-platform"])),
  ),
  clientExtensionResults: passkeyClientExtensionResultsSchema,
  type: Schema.Literal("public-key"),
  user: passkeyUserSchema,
});

export const passkeyAuthenticationSchema = Schema.Struct({
  id: passkeyCredentialIdSchema,
  rawId: passkeyCredentialIdSchema,
  response: Schema.Struct({
    authenticatorData: passkeyBase64UrlSchema,
    clientDataJSON: passkeyBase64UrlSchema,
    signature: passkeyBase64UrlSchema,
    userHandle: Schema.optional(passkeyBase64UrlSchema),
  }),
  authenticatorAttachment: Schema.optional(
    Schema.NullishOr(Schema.Literals(["platform", "cross-platform"])),
  ),
  clientExtensionResults: passkeyClientExtensionResultsSchema,
  type: Schema.Literal("public-key"),
});

export const passkeyCredentialSchema = Schema.Struct({
  id: passkeyCredentialIdSchema,
  publicKey: passkeyBase64UrlSchema,
  algorithm: passkeyAlgorithmSchema,
  transports: Schema.Array(passkeyTransportSchema),
  counter: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  synced: Schema.Boolean,
});

export const passkeyProfileSchema = Schema.Struct({
  id: passkeyCredentialIdSchema,
  transports: Schema.Array(passkeyTransportSchema),
  synced: Schema.Boolean,
  createdAt: timestampSchema,
  lastUsedAt: Schema.NullOr(timestampSchema),
});

export type ListIdentity = Schema.Schema.Type<typeof listIdentitySchema>;
export type IdentityAuth = Schema.Schema.Type<typeof identityAuthSchema>;
export type PublishAuth = Schema.Schema.Type<typeof publishAuthSchema>;
export type DeviceProfile = Schema.Schema.Type<typeof deviceProfileSchema>;
export type UserProfile = Schema.Schema.Type<typeof userProfileSchema>;
export type PasskeyRegistration = Schema.Schema.Type<typeof passkeyRegistrationSchema>;
export type PasskeyAuthentication = Schema.Schema.Type<typeof passkeyAuthenticationSchema>;
export type PasskeyCredential = Schema.Schema.Type<typeof passkeyCredentialSchema>;
export type PasskeyProfile = Schema.Schema.Type<typeof passkeyProfileSchema>;
