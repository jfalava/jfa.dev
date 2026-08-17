import { z } from "zod";

const accessJwkSchema = z.object({
  kid: z.string().min(1),
  kty: z.string().min(1),
  alg: z.string().optional(),
  crv: z.string().optional(),
  x: z.string().optional(),
  y: z.string().optional(),
  n: z.string().optional(),
  e: z.string().optional(),
});

export const accessCertsSchema = z.object({
  keys: z.array(accessJwkSchema),
});

const assertionHeaderSchema = z.object({
  alg: z.string().min(1),
  kid: z.string().min(1),
});

const assertionPayloadSchema = z.object({
  aud: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  iss: z.string().min(1),
  exp: z.number().finite(),
});

type AccessJwk = z.infer<typeof accessJwkSchema>;

export type AccessCerts = z.infer<typeof accessCertsSchema>;

const CERTS_CACHE_TTL_MS = 5 * 60 * 1000;
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

function decodeSegment<T>(value: string, schema: z.ZodType<T>): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(new TextDecoder().decode(decodeBase64Url(value))));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function fetchAccessCerts(teamDomain: string): Promise<AccessCerts> {
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) {
    throw new Error(`Keweke Access certificate lookup failed with ${response.status}`);
  }
  const parsed = accessCertsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Keweke Access certificate payload was malformed");
  }
  return parsed.data;
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
  const [headerSegment, payloadSegment, signatureSegment] = assertion.split(".");
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    return false;
  }

  const header = decodeSegment(headerSegment, assertionHeaderSchema);
  const payload = decodeSegment(payloadSegment, assertionPayloadSchema);
  if (!header || !payload) {
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
  if (payload.exp * 1000 <= Date.now()) {
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
