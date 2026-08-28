import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

const accessJwkSchema = Schema.Struct({
  kid: Schema.String.check(Schema.isMinLength(1)),
  kty: Schema.String.check(Schema.isMinLength(1)),
  alg: Schema.optional(Schema.String),
  crv: Schema.optional(Schema.String),
  x: Schema.optional(Schema.String),
  y: Schema.optional(Schema.String),
  n: Schema.optional(Schema.String),
  e: Schema.optional(Schema.String),
});

export const accessCertsSchema = Schema.Struct({
  keys: Schema.Array(accessJwkSchema),
});

const assertionHeaderSchema = Schema.Struct({
  alg: Schema.String.check(Schema.isMinLength(1)),
  kid: Schema.String.check(Schema.isMinLength(1)),
  typ: Schema.optional(Schema.String),
});

// Cloudflare Access assertion JWTs carry `aud` as an array (e.g. ["8827b6…"])
// even for a single app, so accept both shapes and match with includes/equals.
const assertionPayloadSchema = Schema.Struct({
  aud: Schema.Union([
    Schema.String.check(Schema.isMinLength(1)),
    Schema.Array(Schema.String.check(Schema.isMinLength(1))).check(Schema.isMinLength(1)),
  ]),
  iss: Schema.String.check(Schema.isMinLength(1)),
  exp: Schema.Finite,
  nbf: Schema.optional(Schema.Finite),
});

type AccessJwk = Schema.Schema.Type<typeof accessJwkSchema>;

export type AccessCerts = Schema.Schema.Type<typeof accessCertsSchema>;

const CERTS_CACHE_TTL_MS = 5 * 60 * 1000;
const CLOCK_SKEW_TOLERANCE_MS = 60 * 1000;
const SUPPORTED_ALGORITHMS = new Set(["RS256", "ES256"]);
const certsCache = new Map<string, { certs: AccessCerts; expiresAt: number }>();

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeSegment<T>(value: string, schema: Schema.Codec<T, unknown>): T | null {
  try {
    const parsed = Schema.decodeUnknownResult(schema)(
      JSON.parse(new TextDecoder().decode(decodeBase64Url(value))),
    );
    return Result.isSuccess(parsed) ? parsed.success : null;
  } catch {
    return null;
  }
}

async function fetchAccessCerts(teamDomain: string): Promise<AccessCerts> {
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) {
    throw new Error(`Keweke Access certificate lookup failed with ${response.status}`);
  }
  const parsed = Schema.decodeUnknownResult(accessCertsSchema)(await response.json());
  if (Result.isFailure(parsed)) {
    throw new Error("Keweke Access certificate payload was malformed");
  }
  return parsed.success;
}

async function loadAccessCerts(teamDomain: string, forceRefresh: boolean): Promise<AccessCerts> {
  const cached = forceRefresh ? undefined : certsCache.get(teamDomain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.certs;
  }

  const certs = await fetchAccessCerts(teamDomain);
  certsCache.set(teamDomain, { certs, expiresAt: Date.now() + CERTS_CACHE_TTL_MS });
  return certs;
}

async function verifyWithJwk(
  jwk: AccessJwk,
  signature: Uint8Array<ArrayBuffer>,
  signedContent: Uint8Array<ArrayBuffer>,
): Promise<boolean> {
  try {
    if (jwk.alg === "ES256" && jwk.kty === "EC" && jwk.crv === "P-256") {
      const key = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"],
      );
      return crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        key,
        signature,
        signedContent,
      );
    }
    if (jwk.alg === "RS256" && jwk.kty === "RSA") {
      const key = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );
      return crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, signature, signedContent);
    }
  } catch {
    return false;
  }
  return false;
}

export async function verifyAccessAssertion(
  assertion: string,
  input: { teamDomain: string; aud: string; certs: AccessCerts },
): Promise<boolean> {
  const segments = assertion.split(".");
  if (segments.length !== 3) {
    return false;
  }
  const [headerSegment, payloadSegment, signatureSegment] = segments;

  const header = decodeSegment(headerSegment, assertionHeaderSchema);
  const payload = decodeSegment(payloadSegment, assertionPayloadSchema);
  if (!header || !payload) {
    return false;
  }
  if (!SUPPORTED_ALGORITHMS.has(header.alg)) {
    return false;
  }
  if (header.typ !== undefined && header.typ !== "JWT") {
    return false;
  }
  if (payload.iss !== `https://${input.teamDomain}`) {
    return false;
  }
  const audMatches = Array.isArray(payload.aud)
    ? payload.aud.includes(input.aud)
    : payload.aud === input.aud;
  if (!audMatches) {
    return false;
  }
  if (payload.exp * 1000 + CLOCK_SKEW_TOLERANCE_MS <= Date.now()) {
    return false;
  }
  if (payload.nbf !== undefined && payload.nbf * 1000 > Date.now() + CLOCK_SKEW_TOLERANCE_MS) {
    return false;
  }

  const jwk = input.certs.keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk || jwk.alg !== header.alg) {
    return false;
  }

  return verifyWithJwk(
    jwk,
    decodeBase64Url(signatureSegment),
    new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
  );
}

export async function verifyLiveAccessAssertion(
  assertion: string,
  input: { teamDomain: string; aud: string },
): Promise<boolean> {
  const certs = await loadAccessCerts(input.teamDomain, false);
  if (await verifyAccessAssertion(assertion, { ...input, certs })) {
    return true;
  }

  const kid = decodeSegment(assertion.split(".")[0] ?? "", assertionHeaderSchema)?.kid;
  if (kid && !certs.keys.some((jwk) => jwk.kid === kid)) {
    return verifyAccessAssertion(assertion, {
      ...input,
      certs: await loadAccessCerts(input.teamDomain, true),
    });
  }
  return false;
}
