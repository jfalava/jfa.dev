import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import type * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Layer from "effect/Layer";

/** Secrets Store secret records are created and rotated only from the
 * Cloudflare dashboard. Deployments bind existing records exclusively, so any
 * attempt to create, rotate, delete, or cascade-delete a secret record through
 * this deployment is wrong — including a stray managed-Secret declaration
 * reconciling as a delete against the live secrets. Blocked:
 *   DELETE /accounts/{a}/secrets_store/stores/{store_id}
 *     — store delete cascades its secrets,
 *   DELETE /accounts/{a}/secrets_store/stores/{store_id}/secrets[/{secret_id}]
 *     — bulk and single secret-record deletes,
 *   POST/PUT/PATCH under …/stores/{store_id}/secrets…
 *     — secret-record creates and value rotations. */
const isSecretsStoreSecretWrite = (
  request: HttpClientRequest.HttpClientRequest,
): boolean => {
  if (request.method === "GET") {
    return false;
  }
  const segments = new URL(request.url).pathname
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);
  const storeRoot = segments.indexOf("secrets_store") + 1;
  if (storeRoot === 0 || segments[storeRoot] !== "stores") {
    return false;
  }
  const rest = segments.length - storeRoot;
  if (request.method === "DELETE") {
    return rest === 2 || rest === 3 || rest === 4;
  }
  return segments[storeRoot + 2] === "secrets";
};

const secretsStoreRefuseReason = (
  request: HttpClientRequest.HttpClientRequest,
): string =>
  request.method === "DELETE"
    ? "secret-record deletion is blocked (binding-only deployment)"
    : "secret-record value writes are blocked (binding-only deployment)";

/** Reject any Secrets Store secret-record mutation before it reaches Cloudflare. */
export const validateSecretsStoreWrites = (
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<void> =>
  isSecretsStoreSecretWrite(request)
    ? Effect.die(
        new Error(
          `Refusing Secrets Store change (${request.method} ${new URL(request.url).pathname}): ${secretsStoreRefuseReason(request)}. Create or rotate values in the Cloudflare Secrets Store outside deployment.`,
        ),
      )
    : Effect.void;

/** Add the binding-only Secrets Store guard to Alchemy's ambient HTTP client. */
export const guardedSecretsStoreHttpClient = Layer.effect(
  HttpClient.HttpClient,
  Effect.map(HttpClient.HttpClient, (client) =>
    HttpClient.tapRequest(client, validateSecretsStoreWrites),
  ),
);
