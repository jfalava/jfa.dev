import { describe, expect, it } from "vitest";

import { verifyAccessAssertion, type AccessCerts } from "../src/server/access-jwt";

const TEAM_DOMAIN = "keweke-test.cloudflareaccess.com";
const AUD = "test-audience-tag";

interface TestJwk {
  kid: string;
  kty: string;
  alg: string;
  crv: string;
  x: string;
  y: string;
  privateKey: CryptoKey;
}

interface TestPayload {
  aud: string;
  iss: string;
  sub: string;
  iat: number;
  exp: number;
}

interface PayloadOverrides {
  aud?: string;
  iss?: string;
  exp?: number;
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
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  if (!jwk.x || !jwk.y) {
    throw new Error("The generated EC key pair is missing public coordinates");
  }
  return {
    kid,
    kty: "EC",
    alg: "ES256",
    crv: "P-256",
    x: jwk.x,
    y: jwk.y,
    privateKey: keyPair.privateKey,
  };
}

async function signAssertion(jwk: TestJwk, payload: TestPayload): Promise<string> {
  const header = { alg: jwk.alg, kid: jwk.kid, typ: "JWT" };
  const headerSegment = await encodeBase64UrlText(JSON.stringify(header));
  const payloadSegment = await encodeBase64UrlText(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
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
    keys: jwks.map((jwk) => ({
      kid: jwk.kid,
      kty: jwk.kty,
      alg: jwk.alg,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
    })),
  };
}

describe("verifyAccessAssertion", () => {
  it("accepts a signed assertion for the same team domain and audience", async () => {
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

  it("rejects assertions for another audience, issuer, or expired tokens", async () => {
    const jwk = await createEs256Jwk("test-key-2");
    const valid = await signAssertion(jwk, futurePayload());
    const wrongAudience = await signAssertion(jwk, futurePayload({ aud: "other-aud" }));
    const wrongIssuer = await signAssertion(
      jwk,
      futurePayload({ iss: "https://evil.cloudflareaccess.com" }),
    );
    const expired = await signAssertion(jwk, {
      ...futurePayload(),
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    const input = { teamDomain: TEAM_DOMAIN, aud: AUD, certs: certsFor(jwk) };

    expect(await verifyAccessAssertion(valid, input)).toBe(true);
    expect(await verifyAccessAssertion(wrongAudience, input)).toBe(false);
    expect(await verifyAccessAssertion(wrongIssuer, input)).toBe(false);
    expect(await verifyAccessAssertion(expired, input)).toBe(false);
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
  });
});
