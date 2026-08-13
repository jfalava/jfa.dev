import { resolve } from "node:path";

import { adopt } from "alchemy/AdoptPolicy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

import type { StageConfig, WorkerConfig } from "./config";

const repositoryRoot = resolve(import.meta.dirname, "../..");

function workerDefaults(config: WorkerConfig) {
  return {
    compatibility: {
      date: config.compatibilityDate,
      flags: ["nodejs_compat"],
    },
    observability: {
      enabled: config.observability,
    },
    workersDev: config.workersDev,
  };
}

function localDev(port: number) {
  return {
    host: "0.0.0.0",
    port,
  };
}

export const defineWorkers = Effect.fn("defineWorkers")(function* (
  config: StageConfig,
) {
  const isLocal = config.stage === "local";

  const landing = yield* Cloudflare.Website.Vite("LandingWorker", {
    ...workerDefaults(config.workers.landing),
    name: config.workers.landing.name,
    rootDir: resolve(repositoryRoot, "web/landing"),
    assets: {
      runWorkerFirst: false,
    },
    ...(config.workers.landing.domain === undefined
      ? {}
      : { domain: config.workers.landing.domain }),
    ...(isLocal ? { dev: localDev(3100) } : {}),
  }).pipe(adopt(true));

  const ogImgGen = yield* Cloudflare.Website.Vite("OgImgGenWorker", {
    ...workerDefaults(config.workers.ogImgGen),
    name: config.workers.ogImgGen.name,
    rootDir: resolve(repositoryRoot, "web/og-img-gen"),
    assets: {
      runWorkerFirst: false,
    },
    ...(config.workers.ogImgGen.domain === undefined
      ? {}
      : { domain: config.workers.ogImgGen.domain }),
    ...(isLocal ? { dev: localDev(3101) } : {}),
  }).pipe(adopt(true));

  const hyperscalerStandalone = yield* Cloudflare.Website.Vite(
    "HyperscalerStandaloneWorker",
    {
      ...workerDefaults(config.workers.hyperscalerStandalone),
      name: config.workers.hyperscalerStandalone.name,
      rootDir: resolve(repositoryRoot, "web/hyperscaler-services"),
      assets: {
        runWorkerFirst: false,
      },
      ...(config.workers.hyperscalerStandalone.basePath === undefined
        ? {}
        : {
            env: {
              VITE_BASE_PATH: config.workers.hyperscalerStandalone.basePath,
              ...(config.workers.hyperscalerStandalone.assetBasePath ===
              undefined
                ? {}
                : {
                    VITE_ASSET_BASE_PATH:
                      config.workers.hyperscalerStandalone.assetBasePath,
                  }),
            },
          }),
      ...(config.workers.hyperscalerStandalone.domain === undefined
        ? {}
        : { domain: config.workers.hyperscalerStandalone.domain }),
      ...(isLocal ? { dev: localDev(3103) } : {}),
    },
  ).pipe(adopt(true));

  const hyperscalerMounted = yield* Cloudflare.Website.Vite(
    "HyperscalerMountedWorker",
    {
      ...workerDefaults(config.workers.hyperscalerMounted),
      name: config.workers.hyperscalerMounted.name,
      rootDir: resolve(repositoryRoot, "web/hyperscaler-services"),
      assets: {
        runWorkerFirst: false,
      },
      ...(config.workers.hyperscalerMounted.basePath === undefined
        ? {}
        : {
            env: {
              VITE_BASE_PATH: config.workers.hyperscalerMounted.basePath,
              ...(config.workers.hyperscalerMounted.assetBasePath === undefined
                ? {}
                : {
                    VITE_ASSET_BASE_PATH:
                      config.workers.hyperscalerMounted.assetBasePath,
                  }),
            },
          }),
      ...(config.workers.hyperscalerMounted.domain === undefined
        ? {}
        : { domain: config.workers.hyperscalerMounted.domain }),
      ...(isLocal ? { dev: localDev(3102) } : {}),
    },
  ).pipe(adopt(true));

  const router = yield* Cloudflare.Worker("RouterWorker", {
    ...workerDefaults(config.workers.router),
    name: config.workers.router.name,
    main: resolve(repositoryRoot, "function/router/src/router.ts"),
    env: {
      ROUTES: config.router.routesJson,
      ASSET_PREFIXES: config.router.assetPrefixesJson,
      LANDING: landing,
      OG_IMG_GEN: ogImgGen,
      HYPERSCALER_SERVICES: hyperscalerMounted,
    },
    ...(config.workers.router.domain === undefined
      ? {}
      : { domain: config.workers.router.domain }),
    ...(isLocal ? { dev: localDev(8795) } : {}),
  }).pipe(adopt(true));

  const redirects = yield* Cloudflare.Worker("RedirectsWorker", {
    ...workerDefaults(config.workers.redirects),
    name: config.workers.redirects.name,
    main: resolve(repositoryRoot, "function/redirects/src/redirects.ts"),
    ...(config.workers.redirects.domain === undefined
      ? {}
      : { domain: config.workers.redirects.domain }),
    ...(isLocal ? { dev: localDev(8781) } : {}),
  }).pipe(adopt(true));

  return {
    landing,
    ogImgGen,
    hyperscalerStandalone,
    hyperscalerMounted,
    router,
    redirects,
  };
});
