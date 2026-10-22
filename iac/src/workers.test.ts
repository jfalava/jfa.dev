import { describe, expect, test } from "bun:test";

import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { InMemoryService, State, StateStoreError } from "alchemy/State";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { getStageConfig } from "./config";
import { defineWorkers } from "./workers";

const compile = async (
  stage: string,
  resources: string[] = [],
  storeId = "existing-store-id",
  unavailable = false,
) => {
  const service = await Effect.runPromise(InMemoryService());
  const state = Layer.succeed(
    State,
    Effect.succeed({
      ...service,
      list: ({ stack, stage: requestedStage }) =>
        unavailable
          ? Effect.fail(new StateStoreError({ message: "state unavailable" }))
          : Effect.succeed(
              stack === "jfa-dev" && requestedStage === stage ? resources : [],
            ),
    }),
  );
  const stack = Alchemy.Stack.of({
    name: "jfa-dev",
    stage,
    resources: {},
    bindings: {},
    actions: {},
  });
  await Effect.runPromise(
    defineWorkers(getStageConfig(stage)).pipe(
      Effect.provide(state),
      Effect.provideService(Alchemy.Stack, stack),
      Effect.provideService(Alchemy.Stage, stage),
      Effect.provideService(Cloudflare.Providers, {
        kind: "ProviderCollection",
        providers: {},
        get: () => undefined,
      }),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({ JFA_DEV_SECRETS_STORE_ID: storeId }),
        ),
      ),
    ),
  );
  return stack;
};

describe("Secrets Store ownership", () => {
  test.each(["local", "development", "production"])(
    "%s binds existing secrets without declaring secret resources or values",
    async (stage) => {
      const stack = await compile(stage, ["RouterWorker"]);
      expect(
        Object.values(stack.resources).filter((resource) =>
          resource.Type.startsWith("Cloudflare.SecretsStore."),
        ),
      ).toEqual([]);
      const bindings = stack.bindings.PlaylistsMountedWorker.flatMap(
        (entry) => entry.data.bindings ?? [],
      );
      expect(
        bindings.filter((binding) => binding.name.startsWith("LASTFM_")),
      ).toEqual([
        {
          type: "secrets_store_secret",
          name: "LASTFM_API_KEY",
          storeId: "existing-store-id",
          secretName: "JFA_DEV_LASTFM_API_KEY",
        },
        {
          type: "secrets_store_secret",
          name: "LASTFM_USER",
          storeId: "existing-store-id",
          secretName: "JFA_DEV_LASTFM_USER",
        },
      ]);
    },
  );

  test.each([
    "PlaylistsSecretsStore",
    "PlaylistsLastfmApiKey",
    "PlaylistsLastfmUser",
  ])("refuses to orphan the previously managed %s", async (resource) => {
    await expect(compile("production", [resource])).rejects.toThrow(
      "Secrets Store migration required for jfa-dev/production",
    );
  });

  test("checks the actual Alchemy stage, not the normalized development stage", async () => {
    await expect(
      compile("preview-42", ["PlaylistsLastfmUser"]),
    ).rejects.toThrow(
      "Secrets Store migration required for jfa-dev/preview-42",
    );
  });

  test("does not treat a state backend failure as completed migration", async () => {
    await expect(
      compile("production", [], "existing-store-id", true),
    ).rejects.toThrow("state unavailable");
  });

  test("requires a nonempty store identifier", async () => {
    await expect(compile("production", [], "")).rejects.toThrow(
      "JFA_DEV_SECRETS_STORE_ID",
    );
  });
});
