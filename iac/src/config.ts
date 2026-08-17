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
    countryBlocklistName?: string;
  };
  workers: {
    router: WorkerConfig;
    landing: WorkerConfig;
    ogImgGen: WorkerConfig;
    hyperscalerMounted: WorkerConfig;
    kewekeMounted: WorkerConfig;
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
      preserveMount: true,
    },
    {
      binding: "KEWEKE",
      path: "/keweke",
      preload: true,
      preserveMount: true,
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
  "hyperscalers.jfa.dev",
  "hyperscaler-services.jfa.dev",
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
  const result: WorkerConfig = {
    name: stageName(options.baseName ?? baseName, stage),
    compatibilityDate: options.compatibilityDate,
    workersDev: options.workersDev ?? stage !== "production",
    observability: options.observability,
  };

  if (options.domain !== undefined) {
    result.domain = domainFor(stage, options.domain);
  }
  if (options.basePath !== undefined) {
    result.basePath = options.basePath;
  }
  if (options.assetBasePath !== undefined) {
    result.assetBasePath = options.assetBasePath;
  }

  return result;
}

export function getStageConfig(stage: string | undefined): StageConfig {
  const normalizedStage: InfrastructureStage =
    stage === "local" || stage === "production" ? stage : "development";

  const redirectDomain: WorkerDomain = {
    name: "jfalava.eu",
    aliases: redirectAliases,
  };

  const router: StageConfig["router"] = {
    routesJson: JSON.stringify(routeDefinitions),
    assetPrefixesJson: JSON.stringify(assetPrefixes),
  };
  if (normalizedStage === "production") {
    router.countryBlocklistName = "jfa-router-country-blocklist-prod";
  }

  return {
    stage: normalizedStage,
    router,
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
      hyperscalerMounted: worker(
        "jfa-dev-hyperscaler-services",
        normalizedStage,
        {
          compatibilityDate: compatibilityDate(normalizedStage, "2026-08-13"),
          observability: true,
          workersDev: normalizedStage !== "production",
          basePath: "/hyperscaler-services",
          assetBasePath: "/hyperscaler-services",
        },
      ),
      kewekeMounted: worker("jfa-dev-keweke", normalizedStage, {
        compatibilityDate: compatibilityDate(normalizedStage, "2026-08-13"),
        observability: true,
        workersDev: normalizedStage !== "production",
        basePath: "/keweke",
        assetBasePath: "/keweke",
      }),
      redirects: worker("jfa-redirects", normalizedStage, {
        compatibilityDate: "2026-01-01",
        observability: true,
        domain: redirectDomain,
      }),
    },
  };
}
