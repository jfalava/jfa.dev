/**
 * Canonical ownership map for the Alchemy-managed Cloudflare topology.
 * Keep this list synchronized with src/config.ts and the production runbook.
 */
export const infrastructureInventory = {
  router: {
    worker: "jfa-dev-router",
    domains: ["jfa.dev"],
    publicRoutes: [
      "/",
      "/og-img-gen/*",
      "/hyperscaler-services/*",
      "/keweke/*",
      "/branding/*",
      "/docs/*",
    ],
    bindings: [
      "LANDING",
      "OG_IMG_GEN",
      "HYPERSCALER_SERVICES",
      "KEWEKE",
      "BRANDING",
      "DOCS",
      "COUNTRY_BLOCKLIST",
    ],
  },
  landing: {
    worker: "jfa-dev-landing",
    domains: [],
    publicRoutes: ["/"],
  },
  ogImgGen: {
    worker: "jfa-dev-og-img-gen",
    domains: [],
    publicRoutes: ["/og-img-gen/*"],
  },
  hyperscalerMounted: {
    worker: "jfa-dev-hyperscaler-services",
    domains: [],
    publicRoutes: ["/hyperscaler-services/*"],
    basePath: "/hyperscaler-services",
  },
  kewekeMounted: {
    worker: "jfa-dev-keweke",
    domains: [],
    publicRoutes: ["/keweke/*"],
    basePath: "/keweke",
  },
  brandingMounted: {
    worker: "jfa-dev-branding",
    domains: [],
    publicRoutes: ["/branding/*"],
    basePath: "/branding",
  },
  docsMounted: {
    worker: "jfa-dev-docs",
    domains: [],
    publicRoutes: ["/docs/*"],
    basePath: "/docs",
  },
  kewekeAdminAccess: {
    application: "Keweke Admin",
    domain: "jfa.dev/keweke/admin",
    policyIds: ["6a8e2dfe-13b4-47f5-a954-94ff71425465"],
  },
  redirects: {
    worker: "jfa-redirects",
    domains: [
      "jfalava.eu",
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
    ],
  },
} as const;
