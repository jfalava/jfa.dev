/**
 * Canonical ownership map for the Alchemy-managed Cloudflare topology.
 * Keep this list synchronized with src/config.ts and the production runbook.
 */
export const infrastructureInventory = {
  router: {
    worker: "jfa-dev-router",
    domains: ["jfa.dev"],
    publicRoutes: ["/", "/og-img-gen", "/hyperscaler-services", "/keweke"],
    bindings: [
      "LANDING",
      "OG_IMG_GEN",
      "HYPERSCALER_SERVICES",
      "KEWEKE",
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
    publicRoutes: ["/og-img-gen"],
  },
  hyperscalerMounted: {
    worker: "hyperscaler-services-mounted",
    domains: [],
    publicRoutes: ["/hyperscaler-services/*"],
    basePath: "/hyperscaler-services",
  },
  kewekeMounted: {
    worker: "keweke-mounted",
    domains: [],
    publicRoutes: ["/keweke/*"],
    basePath: "/keweke",
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
    ]
  },
} as const;
