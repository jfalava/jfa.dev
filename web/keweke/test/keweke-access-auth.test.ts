import { afterEach, describe, expect, it, vi } from "vitest";

import {
  verifyAccessAssertion,
  verifyLiveAccessAssertion,
  type AccessCerts,
} from "../src/features/admin/server/access-jwt";

const TEAM_DOMAIN = "keweke-test.cloudflareaccess.com";
const AUD = "test-audience-tag";

interface TestJwk {
  kid: string;
  kty: string;
  alg: string;
  privateKey: CryptoKey;
  publicJwk: JsonWebKey;
}

interface TestPayload {
  aud: string | string[];
  iss: string;
  sub: string;
  iat: number;
  exp: number;
  nbf?: number;
}

interface PayloadOverrides {
  aud?: string | string[];
  iss?: string;
  exp?: number;
  nbf?: number;
}

interface HeaderOverrides {
  alg?: string;
  kid?: string;
  typ?: string;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function encodeBase64UrlText(value: string): Promise<string> {
  return encodeBase64Url(new TextEncoder().encode(value));
}

async function createEs256Jwk(kid: string): Promise<TestJwk> {
  const keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  return {
    kid,
    kty: "EC",
    alg: "ES256",
    privateKey: keyPair.privateKey,
    publicJwk: await crypto.subtle.exportKey("jwk", keyPair.publicKey),
  };
}

async function createRs256Jwk(kid: string): Promise<TestJwk> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  return {
    kid,
    kty: "RSA",
    alg: "RS256",
    privateKey: keyPair.privateKey,
    publicJwk: await crypto.subtle.exportKey("jwk", keyPair.publicKey),
  };
}

async function signAssertion(
  jwk: TestJwk,
  payload: TestPayload,
  headerOverrides: HeaderOverrides = {},
): Promise<string> {
  const header = { alg: jwk.alg, kid: jwk.kid, typ: "JWT", ...headerOverrides };
  const headerSegment = await encodeBase64UrlText(JSON.stringify(header));
  const payloadSegment = await encodeBase64UrlText(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    jwk.alg === "RS256" ? { name: "RSASSA-PKCS1-v1_5" } : { name: "ECDSA", hash: "SHA-256" },
    jwk.privateKey,
    new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
  );
  return `${headerSegment}.${payloadSegment}.${encodeBase64Url(new Uint8Array(signature))}`;
}

function futurePayload(overrides: PayloadOverrides = {}): TestPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    aud: AUD,
    iss: `https://${TEAM_DOMAIN}`,
    sub: "user@example.com",
    iat: now,
    exp: now + 3600,
    ...overrides,
  };
}

function certsFor(...jwks: TestJwk[]): AccessCerts {
  return {
    keys: jwks.map((jwk) => {
      if (jwk.kty === "EC") {
        return {
          kid: jwk.kid,
          kty: jwk.kty,
          alg: jwk.alg,
          crv: jwk.publicJwk.crv,
          x: jwk.publicJwk.x,
          y: jwk.publicJwk.y,
        };
      }
      return {
        kid: jwk.kid,
        kty: jwk.kty,
        alg: jwk.alg,
        n: jwk.publicJwk.n,
        e: jwk.publicJwk.e,
      };
    }),
  };
}

function certsResponse(certs: AccessCerts): Response {
  return new Response(JSON.stringify(certs), {
    headers: { "content-type": "application/json" },
  });
}

describe("verifyAccessAssertion", () => {
  it("accepts a signed ES256 assertion for the same team domain and audience", async () => {
    const jwk = await createEs256Jwk("test-key-1");
    const assertion = await signAssertion(jwk, futurePayload());

    expect(
      await verifyAccessAssertion(assertion, {
        teamDomain: TEAM_DOMAIN,
        aud: AUD,
        certs: certsFor(jwk),
      }),
    ).toBe(true);
  });

  it("accepts a signed RS256 assertion for the same team domain and audience", async () => {
    const jwk = await createRs256Jwk("rsa-key-1");
    const assertion = await signAssertion(jwk, futurePayload());

    expect(
      await verifyAccessAssertion(assertion, {
        teamDomain: TEAM_DOMAIN,
        aud: AUD,
        certs: certsFor(jwk),
      }),
    ).toBe(true);
  });

  it("accepts an assertion whose audience claim is an array", async () => {
    const jwk = await createEs256Jwk("test-key-1");
    const assertion = await signAssertion(jwk, futurePayload({ aud: [AUD, "another-aud"] }));

    expect(
      await verifyAccessAssertion(assertion, {
        teamDomain: TEAM_DOMAIN,
        aud: AUD,
        certs: certsFor(jwk),
      }),
    ).toBe(true);
  });

  it("rejects assertions for another audience, issuer, or expired tokens", async () => {
    const jwk = await createEs256Jwk("test-key-2");
    const valid = await signAssertion(jwk, futurePayload());
    const wrongAudience = await signAssertion(jwk, futurePayload({ aud: "other-aud" }));
    const wrongArrayAudience = await signAssertion(jwk, futurePayload({ aud: ["other-aud"] }));
    const wrongIssuer = await signAssertion(
      jwk,
      futurePayload({ iss: "https://evil.cloudflareaccess.com" }),
    );
    const expired = await signAssertion(jwk, {
      ...futurePayload(),
      exp: Math.floor(Date.now() / 1000) - 120,
    });
    const input = { teamDomain: TEAM_DOMAIN, aud: AUD, certs: certsFor(jwk) };

    expect(await verifyAccessAssertion(valid, input)).toBe(true);
    expect(await verifyAccessAssertion(wrongAudience, input)).toBe(false);
    expect(await verifyAccessAssertion(wrongArrayAudience, input)).toBe(false);
    expect(await verifyAccessAssertion(wrongIssuer, input)).toBe(false);
    expect(await verifyAccessAssertion(expired, input)).toBe(false);
  });

  it("accepts an exp within the clock-skew tolerance and rejects one beyond it", async () => {
    const jwk = await createEs256Jwk("leeway-key");
    const input = { teamDomain: TEAM_DOMAIN, aud: AUD, certs: certsFor(jwk) };
    const now = Math.floor(Date.now() / 1000);
    const withinLeeway = await signAssertion(jwk, futurePayload({ exp: now - 30 }));
    const beyondLeeway = await signAssertion(jwk, futurePayload({ exp: now - 120 }));

    expect(await verifyAccessAssertion(withinLeeway, input)).toBe(true);
    expect(await verifyAccessAssertion(beyondLeeway, input)).toBe(false);
  });

  it("rejects a not-before claim in the future and accepts one in the past", async () => {
    const jwk = await createEs256Jwk("nbf-key");
    const input = { teamDomain: TEAM_DOMAIN, aud: AUD, certs: certsFor(jwk) };
    const now = Math.floor(Date.now() / 1000);
    const futureNbf = await signAssertion(jwk, futurePayload({ nbf: now + 120 }));
    const pastNbf = await signAssertion(jwk, futurePayload({ nbf: now - 120 }));

    expect(await verifyAccessAssertion(futureNbf, input)).toBe(false);
    expect(await verifyAccessAssertion(pastNbf, input)).toBe(true);
  });

  it("rejects a header with an unsupported typ claim", async () => {
    const jwk = await createEs256Jwk("typ-key");
    const assertion = await signAssertion(jwk, futurePayload(), { typ: "at+jwt" });

    expect(
      await verifyAccessAssertion(assertion, {
        teamDomain: TEAM_DOMAIN,
        aud: AUD,
        certs: certsFor(jwk),
      }),
    ).toBe(false);
  });

  it("rejects tampered signatures, unknown keys, and malformed assertions", async () => {
    const jwk = await createEs256Jwk("test-key-3");
    const otherJwk = await createEs256Jwk("test-key-4");
    const assertion = await signAssertion(jwk, futurePayload());
    const [header, payload, signature] = assertion.split(".");
    const tampered = `${header}.${payload}.${"A".repeat(signature.length)}`;
    const input = { teamDomain: TEAM_DOMAIN, aud: AUD, certs: certsFor(jwk) };

    expect(await verifyAccessAssertion(tampered, input)).toBe(false);
    expect(
      await verifyAccessAssertion(assertion, {
        teamDomain: TEAM_DOMAIN,
        aud: AUD,
        certs: certsFor(otherJwk),
      }),
    ).toBe(false);
    expect(await verifyAccessAssertion("not-a-jwt", input)).toBe(false);
    expect(await verifyAccessAssertion("", input)).toBe(false);
    expect(await verifyAccessAssertion(`${assertion}.extra`, input)).toBe(false);
  });

  it("rejects a tampered RS256 signature", async () => {
    const jwk = await createRs256Jwk("rsa-key-2");
    const assertion = await signAssertion(jwk, futurePayload());
    const [header, payload] = assertion.split(".");
    const tampered = `${header}.${payload}.${"A".repeat(256)}`;
    const input = { teamDomain: TEAM_DOMAIN, aud: AUD, certs: certsFor(jwk) };

    expect(await verifyAccessAssertion(assertion, input)).toBe(true);
    expect(await verifyAccessAssertion(tampered, input)).toBe(false);
  });
});

describe("verifyLiveAccessAssertion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refreshes cached certs once when the assertion kid is rotated", async () => {
    const oldKey = await createEs256Jwk("old-key");
    const newKey = await createEs256Jwk("new-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(certsResponse(certsFor(oldKey)))
      .mockResolvedValueOnce(certsResponse(certsFor(newKey)));
    vi.stubGlobal("fetch", fetchMock);

    const assertion = await signAssertion(
      newKey,
      futurePayload({ iss: "https://rotation.cloudflareaccess.com" }),
    );

    expect(
      await verifyLiveAccessAssertion(assertion, {
        teamDomain: "rotation.cloudflareaccess.com",
        aud: AUD,
      }),
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("serves cached certs without refetching for a known kid", async () => {
    const key = await createEs256Jwk("cached-key");
    const fetchMock = vi.fn().mockResolvedValue(certsResponse(certsFor(key)));
    vi.stubGlobal("fetch", fetchMock);

    const assertion = await signAssertion(
      key,
      futurePayload({ iss: "https://cached.cloudflareaccess.com" }),
    );
    const input = { teamDomain: "cached.cloudflareaccess.com", aud: AUD };

    expect(await verifyLiveAccessAssertion(assertion, input)).toBe(true);
    expect(await verifyLiveAccessAssertion(assertion, input)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown kid even after refreshing certs", async () => {
    const key = await createEs256Jwk("known-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(certsResponse(certsFor(key)))
      .mockResolvedValueOnce(certsResponse(certsFor(key)));
    vi.stubGlobal("fetch", fetchMock);

    const unknownKidKey = await createEs256Jwk("unknown-key");
    const assertion = await signAssertion(
      unknownKidKey,
      futurePayload({ iss: "https://unknown-kid.cloudflareaccess.com" }),
    );

    expect(
      await verifyLiveAccessAssertion(assertion, {
        teamDomain: "unknown-kid.cloudflareaccess.com",
        aud: AUD,
      }),
    ).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
