import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { adopt } from "alchemy/AdoptPolicy";
import * as Cloudflare from "alchemy/Cloudflare";
import type { Output } from "alchemy/Output";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import type { StageConfig, WorkerConfig } from "./config";

const repositoryRoot = resolve(import.meta.dirname, "../..");

function loadDevVarsForLocal(): void {
  // Alchemy's `effect/Config` reads from `process.env`, but `alchemy dev`
  // doesn't auto-load `web/playlist/.dev.vars`. Load it here so editing
  // that file is enough for local dev (matches your request).
  const candidates = [
    resolve(repositoryRoot, "web/playlist/.dev.vars"),
    resolve(repositoryRoot, ".dev.vars"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const raw = readFileSync(file, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      // strip surrounding quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env) || process.env[key] === "") {
        process.env[key] = value;
      }
    }
  }
}

type HyperscalerEnvironment = {
  VITE_BASE_PATH: string;
  VITE_ASSET_BASE_PATH?: string;
};

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
  if (isLocal) {
    loadDevVarsForLocal();
  }

  const landingOptions = {
    ...workerDefaults(config.workers.landing),
    name: config.workers.landing.name,
    rootDir: resolve(repositoryRoot, "web/landing"),
    assets: {
      runWorkerFirst: false,
    },
  };
  if (config.workers.landing.domain !== undefined) {
    Object.assign(landingOptions, { domain: config.workers.landing.domain });
  }
  if (isLocal) {
    Object.assign(landingOptions, { dev: localDev(3100) });
  }
  const landing = yield* Cloudflare.Website.Vite(
    "LandingWorker",
    landingOptions,
  ).pipe(adopt(true));

  const opengraphOptions = {
    ...workerDefaults(config.workers.opengraph),
    name: config.workers.opengraph.name,
    rootDir: resolve(repositoryRoot, "web/opengraph"),
    assets: {
      runWorkerFirst: false,
    },
  };
  if (config.workers.opengraph.domain !== undefined) {
    Object.assign(opengraphOptions, { domain: config.workers.opengraph.domain });
  }
  if (isLocal) {
    Object.assign(opengraphOptions, { dev: localDev(3101) });
  }
  const opengraph = yield* Cloudflare.Website.Vite(
    "OpengraphWorker",
    opengraphOptions,
  ).pipe(adopt(true));

  const hyperscalerOptions = {
    ...workerDefaults(config.workers.hyperscalerMounted),
    name: config.workers.hyperscalerMounted.name,
    rootDir: resolve(repositoryRoot, "web/hyperscaler-services"),
    assets: {
      runWorkerFirst: false,
    },
  };
  if (config.workers.hyperscalerMounted.basePath !== undefined) {
    const env: HyperscalerEnvironment = {
      VITE_BASE_PATH: config.workers.hyperscalerMounted.basePath,
    };
    if (config.workers.hyperscalerMounted.assetBasePath !== undefined) {
      env.VITE_ASSET_BASE_PATH =
        config.workers.hyperscalerMounted.assetBasePath;
    }
    Object.assign(hyperscalerOptions, { env });
  }
  if (config.workers.hyperscalerMounted.domain !== undefined) {
    Object.assign(hyperscalerOptions, {
      domain: config.workers.hyperscalerMounted.domain,
    });
  }
  if (isLocal) {
    Object.assign(hyperscalerOptions, { dev: localDev(3102) });
  }
  const hyperscalerMounted = yield* Cloudflare.Website.Vite(
    "HyperscalerMountedWorker",
    hyperscalerOptions,
  ).pipe(adopt(true));

  const kewekeLists = Cloudflare.DurableObject("KewekeList", {
    className: "KewekeList",
  });
  const kewekeAliases = Cloudflare.DurableObject("KewekeAliasDirectory", {
    className: "KewekeAliasDirectory",
  });
  const kewekePairing = Cloudflare.DurableObject("KewekePairingSession", {
    className: "KewekePairingSession",
  });
  const kewekePasskeySessions = Cloudflare.DurableObject(
    "KewekePasskeySession",
    {
      className: "KewekePasskeySession",
    },
  );
  const kewekeUsers = Cloudflare.DurableObject("KewekeUserDirectory", {
    className: "KewekeUserDirectory",
  });

  const kewekeAdminAccess =
    config.stage === "production"
      ? yield* Cloudflare.Access.Application("KewekeAdminAccessApp", {
          type: "self_hosted",
          name: "Keweke Admin",
          domain: "jfa.dev/keweke/admin",
          sessionDuration: "24h",
          policies: ["6a8e2dfe-13b4-47f5-a954-94ff71425465"],
        }).pipe(adopt(true))
      : undefined;

  type KewekeEnvironment = {
    KEWEKE_LISTS: typeof kewekeLists;
    KEWEKE_ALIASES: typeof kewekeAliases;
    KEWEKE_PAIRING: typeof kewekePairing;
    KEWEKE_PASSKEY_SESSIONS: typeof kewekePasskeySessions;
    KEWEKE_USERS: typeof kewekeUsers;
    VITE_BASE_PATH?: string;
    VITE_ASSET_BASE_PATH?: string;
    KEWEKE_ACCESS_TEAM_DOMAIN?: string;
    KEWEKE_ACCESS_ADMIN_AUD?: string | Output<string>;
  };

  const kewekeEnv: KewekeEnvironment = {
    KEWEKE_LISTS: kewekeLists,
    KEWEKE_ALIASES: kewekeAliases,
    KEWEKE_PAIRING: kewekePairing,
    KEWEKE_PASSKEY_SESSIONS: kewekePasskeySessions,
    KEWEKE_USERS: kewekeUsers,
  };
  if (config.workers.kewekeMounted.basePath !== undefined) {
    kewekeEnv.VITE_BASE_PATH = config.workers.kewekeMounted.basePath;
    if (config.workers.kewekeMounted.assetBasePath !== undefined) {
      kewekeEnv.VITE_ASSET_BASE_PATH =
        config.workers.kewekeMounted.assetBasePath;
    }
  }
  if (kewekeAdminAccess !== undefined) {
    kewekeEnv.KEWEKE_ACCESS_TEAM_DOMAIN = "jfa-d.cloudflareaccess.com";
    kewekeEnv.KEWEKE_ACCESS_ADMIN_AUD = kewekeAdminAccess.aud;
  }
  const kewekeOptions = {
    ...workerDefaults(config.workers.kewekeMounted),
    name: config.workers.kewekeMounted.name,
    rootDir: resolve(repositoryRoot, "web/keweke"),
    main: resolve(repositoryRoot, "web/keweke/src/server-entry.ts"),
    assets: {
      runWorkerFirst: false,
    },
    env: kewekeEnv,
  };
  if (config.workers.kewekeMounted.domain !== undefined) {
    Object.assign(kewekeOptions, {
      domain: config.workers.kewekeMounted.domain,
    });
  }
  if (isLocal) {
    Object.assign(kewekeOptions, { dev: localDev(3103) });
  }
  const kewekeMounted = yield* Cloudflare.Website.Vite(
    "KewekeMountedWorker",
    kewekeOptions,
  ).pipe(adopt(true));

  const brandingOptions = {
    ...workerDefaults(config.workers.brandingMounted),
    name: config.workers.brandingMounted.name,
    rootDir: resolve(repositoryRoot, "web/branding"),
    assets: {
      runWorkerFirst: false,
    },
  };
  if (config.workers.brandingMounted.basePath !== undefined) {
    const env: HyperscalerEnvironment = {
      VITE_BASE_PATH: config.workers.brandingMounted.basePath,
    };
    if (config.workers.brandingMounted.assetBasePath !== undefined) {
      env.VITE_ASSET_BASE_PATH = config.workers.brandingMounted.assetBasePath;
    }
    Object.assign(brandingOptions, { env });
  }
  if (config.workers.brandingMounted.domain !== undefined) {
    Object.assign(brandingOptions, {
      domain: config.workers.brandingMounted.domain,
    });
  }
  if (isLocal) {
    Object.assign(brandingOptions, { dev: localDev(3104) });
  }
  const brandingMounted = yield* Cloudflare.Website.Vite(
    "BrandingMountedWorker",
    brandingOptions,
  ).pipe(adopt(true));

  const docsOptions = {
    ...workerDefaults(config.workers.docsMounted),
    name: config.workers.docsMounted.name,
    rootDir: resolve(repositoryRoot, "web/docs"),
    assets: {
      runWorkerFirst: false,
    },
  };
  if (config.workers.docsMounted.basePath !== undefined) {
    const env: HyperscalerEnvironment = {
      VITE_BASE_PATH: config.workers.docsMounted.basePath,
    };
    if (config.workers.docsMounted.assetBasePath !== undefined) {
      env.VITE_ASSET_BASE_PATH = config.workers.docsMounted.assetBasePath;
    }
    Object.assign(docsOptions, { env });
  }
  if (config.workers.docsMounted.domain !== undefined) {
    Object.assign(docsOptions, {
      domain: config.workers.docsMounted.domain,
    });
  }
  if (isLocal) {
    Object.assign(docsOptions, { dev: localDev(3105) });
  }
  const docsMounted = yield* Cloudflare.Website.Vite(
    "DocsMountedWorker",
    docsOptions,
  ).pipe(adopt(true));

  // Playlist: 20tracks + Last.fm now-playing.
  // Prod/sync: Secrets Store (env.LASTFM_*.get(), never exposed to client).
  // Local: plain `secret_text` from `effect/Config` seeded by `web/playlist/.dev.vars`
  // (via loadDevVarsForLocal above) — avoids LocalSecretsStore emulation flakiness
  // that was causing `Invalid server function ID` in `alchemy dev`.
  let playlistSecretsStore: ReturnType<typeof Cloudflare.SecretsStore.Store> | undefined;
  let lastfmApiKeySecret: ReturnType<typeof Cloudflare.SecretsStore.Secret> | undefined;
  let lastfmUserSecret: ReturnType<typeof Cloudflare.SecretsStore.Secret> | undefined;

  const lastfmApiKeyValue = yield* Config.redacted("LASTFM_API_KEY").pipe(
    Config.withDefault(Redacted.make("")),
  );
  const lastfmUserValue = yield* Config.redacted("LASTFM_USER").pipe(
    Config.withDefault(Redacted.make("")),
  );

  type PlaylistEnvironment = {
    LASTFM_API_KEY: ReturnType<typeof Redacted.make> | typeof lastfmApiKeySecret;
    LASTFM_USER: ReturnType<typeof Redacted.make> | typeof lastfmUserSecret;
    VITE_BASE_PATH?: string;
    VITE_ASSET_BASE_PATH?: string;
  };
  let playlistEnv: PlaylistEnvironment;

  if (isLocal) {
    playlistEnv = {
      LASTFM_API_KEY: lastfmApiKeyValue,
      LASTFM_USER: lastfmUserValue,
    };
  } else {
    playlistSecretsStore = yield* Cloudflare.SecretsStore.Store(
      "PlaylistSecretsStore",
    ).pipe(adopt(true));

    lastfmApiKeySecret = yield* Cloudflare.SecretsStore.Secret(
      "PlaylistLastfmApiKey",
      {
        store: playlistSecretsStore,
        value: lastfmApiKeyValue,
      },
    ).pipe(adopt(true));

    lastfmUserSecret = yield* Cloudflare.SecretsStore.Secret(
      "PlaylistLastfmUser",
      {
        store: playlistSecretsStore,
        value: lastfmUserValue,
      },
    ).pipe(adopt(true));

    playlistEnv = {
      LASTFM_API_KEY: lastfmApiKeySecret,
      LASTFM_USER: lastfmUserSecret,
    };
  }
  if (config.workers.playlistMounted.basePath !== undefined) {
    playlistEnv.VITE_BASE_PATH = config.workers.playlistMounted.basePath;
    if (config.workers.playlistMounted.assetBasePath !== undefined) {
      playlistEnv.VITE_ASSET_BASE_PATH =
        config.workers.playlistMounted.assetBasePath;
    }
  }
  const playlistOptions = {
    ...workerDefaults(config.workers.playlistMounted),
    name: config.workers.playlistMounted.name,
    rootDir: resolve(repositoryRoot, "web/playlist"),
    assets: {
      runWorkerFirst: false,
    },
    env: playlistEnv,
  };
  if (config.workers.playlistMounted.domain !== undefined) {
    Object.assign(playlistOptions, {
      domain: config.workers.playlistMounted.domain,
    });
  }
  if (isLocal) {
    Object.assign(playlistOptions, { dev: localDev(3106) });
  }
  const playlistMounted = yield* Cloudflare.Website.Vite(
    "PlaylistMountedWorker",
    playlistOptions,
  ).pipe(adopt(true));

  const countryBlocklist =
    config.stage === "production" && config.router.countryBlocklistName
      ? yield* Cloudflare.KV.Namespace(config.router.countryBlocklistName, {
          title: config.router.countryBlocklistName,
        }).pipe(adopt(true))
      : undefined;

  type RouterEnvironment = {
    ROUTES: string;
    ASSET_PREFIXES: string;
    LANDING: typeof landing;
    OPENGRAPH: typeof opengraph;
    HYPERSCALER_SERVICES: typeof hyperscalerMounted;
    KEWEKE: typeof kewekeMounted;
    BRANDING: typeof brandingMounted;
    DOCS: typeof docsMounted;
    PLAYLIST: typeof playlistMounted;
    COUNTRY_BLOCKLIST?: typeof countryBlocklist;
  };
  const routerEnv: RouterEnvironment = {
    ROUTES: config.router.routesJson,
    ASSET_PREFIXES: config.router.assetPrefixesJson,
    LANDING: landing,
    OPENGRAPH: opengraph,
    HYPERSCALER_SERVICES: hyperscalerMounted,
    KEWEKE: kewekeMounted,
    BRANDING: brandingMounted,
    DOCS: docsMounted,
    PLAYLIST: playlistMounted,
  };
  if (countryBlocklist !== undefined) {
    routerEnv.COUNTRY_BLOCKLIST = countryBlocklist;
  }
  const routerOptions = {
    ...workerDefaults(config.workers.router),
    name: config.workers.router.name,
    main: resolve(repositoryRoot, "function/router/src/router.ts"),
    env: routerEnv,
  };
  if (config.workers.router.domain !== undefined) {
    Object.assign(routerOptions, { domain: config.workers.router.domain });
  }
  if (isLocal) {
    Object.assign(routerOptions, { dev: localDev(8795) });
  }
  const router = yield* Cloudflare.Worker("RouterWorker", routerOptions).pipe(
    adopt(true),
  );

  const redirectsOptions = {
    ...workerDefaults(config.workers.redirects),
    name: config.workers.redirects.name,
    main: resolve(repositoryRoot, "function/redirects/src/redirects.ts"),
  };
  if (config.workers.redirects.domain !== undefined) {
    Object.assign(redirectsOptions, {
      domain: config.workers.redirects.domain,
    });
  }
  if (isLocal) {
    Object.assign(redirectsOptions, { dev: localDev(8781) });
  }
  const redirects = yield* Cloudflare.Worker(
    "RedirectsWorker",
    redirectsOptions,
  ).pipe(adopt(true));

  return {
    landing,
    opengraph,
    hyperscalerMounted,
    kewekeMounted,
    brandingMounted,
    docsMounted,
    playlistMounted,
    router,
    redirects,
  };
});
