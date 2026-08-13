export type InfrastructureStage = "local" | "development" | "production";

export type WorkerDomain = {
  name: string;
  aliases?: string[];
};

export type WorkerConfig = {
  name: string;
  compatibilityDate: string;
  workersDev: boolean;
  observability: boolean;
  domain?: string | WorkerDomain;
  basePath?: string;
  assetBasePath?: string;
};

export type StageConfig = {
  stage: InfrastructureStage;
  router: {
    routesJson: string;
    assetPrefixesJson: string;
  };
  workers: {
    router: WorkerConfig;
    landing: WorkerConfig;
    ogImgGen: WorkerConfig;
    hyperscalerStandalone: WorkerConfig;
    hyperscalerMounted: WorkerConfig;
    redirects: WorkerConfig;
  };
};

const routeDefinitions = {
  smoothTransitions: true,
  routes: [
    { binding: "LANDING", path: "/", preload: true },
    { binding: "OG_IMG_GEN", path: "/og-img-gen", preload: true },
    {
      binding: "HYPERSCALER_SERVICES",
      path: "/hyperscaler-services",
      preload: true,
    },
  ],
};

const assetPrefixes = [
  "/icons/",
  "/manifest.json",
  "/theme-init.js",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

const redirectAliases = [
  "cv.jfalava.eu",
  "jfalava.ovh",
  "www.jfalava.ovh",
  "proyecto.jfalava.ovh",
  "downloads.jfalava.ovh",
  "jfa.ovh",
  "www.jfa.ovh",
  "links.jfa.ovh",
  "link-shortener.jfa.ovh",
  "cv.jfa.dev",
  "landing.jfa.dev",
  "www.jfa.dev",
  "links.jfa.dev",
  "link.jfa.dev",
];

function stageName(baseName: string, stage: InfrastructureStage): string {
  return stage === "production" ? baseName : `${baseName}-${stage}`;
}

function compatibilityDate(
  stage: InfrastructureStage,
  productionDate: string,
): string {
  return stage === "local" ? "2026-07-11" : productionDate;
}

function domainFor(
  stage: InfrastructureStage,
  domain: string | WorkerDomain,
): string | WorkerDomain | undefined {
  return stage === "production" ? domain : undefined;
}

function worker(
  baseName: string,
  stage: InfrastructureStage,
  options: Omit<WorkerConfig, "name" | "domain" | "workersDev"> & {
    domain?: string | WorkerDomain;
    workersDev?: boolean;
    baseName?: string;
  },
): WorkerConfig {
  return {
    name: stageName(options.baseName ?? baseName, stage),
    compatibilityDate: options.compatibilityDate,
    workersDev: options.workersDev ?? stage !== "production",
    observability: options.observability,
    ...(options.domain === undefined
      ? {}
      : { domain: domainFor(stage, options.domain) }),
    ...(options.basePath === undefined ? {} : { basePath: options.basePath }),
    ...(options.assetBasePath === undefined
      ? {}
      : { assetBasePath: options.assetBasePath }),
  };
}

export function getStageConfig(stage: string | undefined): StageConfig {
  const normalizedStage: InfrastructureStage =
    stage === "local" || stage === "production" ? stage : "development";

  const redirectDomain: WorkerDomain = {
    name: "jfalava.eu",
    aliases: redirectAliases,
  };

  return {
    stage: normalizedStage,
    router: {
      routesJson: JSON.stringify(routeDefinitions),
      assetPrefixesJson: JSON.stringify(assetPrefixes),
    },
    workers: {
      router: worker("jfa-dev-router", normalizedStage, {
        compatibilityDate: compatibilityDate(normalizedStage, "2026-08-13"),
        observability: true,
        domain: "jfa.dev",
      }),
      landing: worker("jfa-dev-landing", normalizedStage, {
        compatibilityDate: "2026-01-01",
        observability: true,
        workersDev: true,
      }),
      ogImgGen: worker("jfa-dev-og-img-gen", normalizedStage, {
        compatibilityDate: "2026-01-01",
        observability: true,
        workersDev: true,
      }),
      hyperscalerStandalone: worker("hyperscaler-services", normalizedStage, {
        compatibilityDate: compatibilityDate(normalizedStage, "2026-08-13"),
        observability: false,
        workersDev: normalizedStage !== "production",
        domain: "hyperscalers.jfa.dev",
        basePath: "/",
        assetBasePath: "/",
      }),
      hyperscalerMounted: worker(
        "hyperscaler-services-mounted",
        normalizedStage,
        {
          compatibilityDate: compatibilityDate(normalizedStage, "2026-08-13"),
          observability: false,
          workersDev: normalizedStage !== "production",
          basePath: "/hyperscaler-services",
          assetBasePath: "/",
        },
      ),
      redirects: worker("jfa-redirects", normalizedStage, {
        compatibilityDate: "2026-01-01",
        observability: true,
        domain: redirectDomain,
      }),
    },
  };
}
