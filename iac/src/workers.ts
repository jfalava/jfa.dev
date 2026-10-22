import { resolve } from "node:path";

import { Stack } from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import * as Cloudflare from "alchemy/Cloudflare";
import type { Output } from "alchemy/Output";
import { State } from "alchemy/State";
import { Stage } from "alchemy/Stage";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

import type { StageConfig, WorkerConfig } from "./config";

const repositoryRoot = resolve(import.meta.dirname, "../..");

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
  const stack = yield* Stack;
  const stage = yield* Stage;
  const state = yield* yield* State;
  const resources = yield* state
    .list({ stack: stack.name, stage })
    .pipe(Effect.orDie);
  // Removing managed Secret declarations otherwise schedules their deletion.
  // Fail before planning until an operator explicitly forgets only these rows.
  const managedSecrets = resources.filter((fqn) =>
    [
      "PlaylistsSecretsStore",
      "PlaylistsLastfmApiKey",
      "PlaylistsLastfmUser",
    ].includes(fqn),
  );
  if (managedSecrets.length > 0) {
    return yield* Effect.die(
      new Error(
        `Secrets Store migration required for ${stack.name}/${stage}: ${managedSecrets.join(", ")}. See iac/README.md before deploying; do not delete the cloud secrets.`,
      ),
    );
  }
  // This is a non-secret identifier; secret values never enter the deployment.
  const playlistsSecretsStoreId = yield* Config.NonEmptyString(
    "JFA_DEV_SECRETS_STORE_ID",
  );

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
    Object.assign(opengraphOptions, {
      domain: config.workers.opengraph.domain,
    });
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

  type PlaylistsEnvironment = {
    VITE_BASE_PATH?: string;
    VITE_ASSET_BASE_PATH?: string;
  };
  const playlistsEnv: PlaylistsEnvironment = {};
  if (config.workers.playlistsMounted.basePath !== undefined) {
    playlistsEnv.VITE_BASE_PATH = config.workers.playlistsMounted.basePath;
    if (config.workers.playlistsMounted.assetBasePath !== undefined) {
      playlistsEnv.VITE_ASSET_BASE_PATH =
        config.workers.playlistsMounted.assetBasePath;
    }
  }
  const playlistsOptions = {
    ...workerDefaults(config.workers.playlistsMounted),
    name: config.workers.playlistsMounted.name,
    rootDir: resolve(repositoryRoot, "web/playlists"),
    assets: {
      runWorkerFirst: false,
    },
    env: playlistsEnv,
  };
  if (config.workers.playlistsMounted.domain !== undefined) {
    Object.assign(playlistsOptions, {
      domain: config.workers.playlistsMounted.domain,
    });
  }
  if (isLocal) {
    Object.assign(playlistsOptions, { dev: localDev(3106) });
  }
  const playlistsMounted = yield* Cloudflare.Website.Vite(
    "PlaylistsMountedWorker",
    playlistsOptions,
  ).pipe(adopt(true));
  // Bind existing secrets without managing their lifecycle or values. Real store
  // IDs also use Alchemy's remote bindings proxy during local development.
  yield* playlistsMounted.bind("LastfmSecrets", {
    bindings: [
      {
        type: "secrets_store_secret",
        name: "LASTFM_API_KEY",
        storeId: playlistsSecretsStoreId,
        secretName: "JFA_DEV_LASTFM_API_KEY",
      },
      {
        type: "secrets_store_secret",
        name: "LASTFM_USER",
        storeId: playlistsSecretsStoreId,
        secretName: "JFA_DEV_LASTFM_USER",
      },
    ],
  });

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
    PLAYLISTS: typeof playlistsMounted;
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
    PLAYLISTS: playlistsMounted,
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
    playlistsMounted,
    router,
    redirects,
  };
});
