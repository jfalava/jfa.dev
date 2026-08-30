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
      "/opengraph/*",
      "/hyperscaler-services/*",
      "/keweke/*",
      "/branding/*",
      "/docs/*",
      "/playlists/*",
    ],
    bindings: [
      "LANDING",
      "OPENGRAPH",
      "HYPERSCALER_SERVICES",
      "KEWEKE",
      "BRANDING",
      "DOCS",
      "PLAYLISTS",
      "COUNTRY_BLOCKLIST",
    ],
  },
  landing: {
    worker: "jfa-dev-landing",
    domains: [],
    publicRoutes: ["/"],
  },
  opengraph: {
    worker: "jfa-dev-opengraph",
    domains: [],
    publicRoutes: ["/opengraph/*"],
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
  playlistsMounted: {
    worker: "jfa-dev-playlists",
    domains: [],
    publicRoutes: ["/playlists/*"],
    basePath: "/playlists",
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
