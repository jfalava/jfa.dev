import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as HttpClientRequest from "effect/http/HttpClientRequest";

import { validateSecretsStoreWrites } from "./secrets-store-guard";

const secretsStoreRequest = (
  method: "DELETE" | "POST" | "PUT" | "PATCH" | "GET",
  pathSuffix: string,
) =>
  HttpClientRequest.make(method)(
    `https://api.cloudflare.com/client/v4/accounts/account/secrets_store/${pathSuffix}`,
  );

test("blocks secret record deletion, cascade store deletion, and value writes", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const blocked: Array<[string, HttpClientRequest.HttpClientRequest]> = [
        [
          "single secret delete",
          secretsStoreRequest("DELETE", "stores/store-id/secrets/secret-id"),
        ],
        [
          "bulk secret delete",
          secretsStoreRequest("DELETE", "stores/store-id/secrets"),
        ],
        [
          "cascade store delete",
          secretsStoreRequest("DELETE", "stores/store-id"),
        ],
        [
          "bulk secret create",
          secretsStoreRequest("POST", "stores/store-id/secrets"),
        ],
        [
          "value rotation",
          secretsStoreRequest("PATCH", "stores/store-id/secrets/secret-id"),
        ],
        [
          "upsert",
          secretsStoreRequest("PUT", "stores/store-id/secrets/secret-id"),
        ],
      ];

      for (const [, request] of blocked) {
        const result = yield* Effect.exit(validateSecretsStoreWrites(request));
        expect(Exit.isFailure(result)).toBe(true);
      }
    }),
  ));

test("allows Secrets Store reads and bind-relevant store operations through", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const allowed: Array<HttpClientRequest.HttpClientRequest> = [
        secretsStoreRequest("GET", "stores"),
        secretsStoreRequest("GET", "stores/store-id/secrets"),
        secretsStoreRequest("GET", "stores/store-id/secrets/secret-id"),
        secretsStoreRequest("POST", "stores"),
        secretsStoreRequest("PATCH", "stores/store-id"),
      ];

      for (const request of allowed) {
        const result = yield* Effect.exit(validateSecretsStoreWrites(request));
        expect(Exit.isSuccess(result)).toBe(true);
      }
    }),
  ));
