/**
 * Canonical ownership map for the Alchemy-managed Cloudflare topology.
 * Keep this list synchronized with src/config.ts and the production runbook.
 */
export const infrastructureInventory = {
  router: {
    worker: "jfa-dev-router",
    domains: ["jfa.dev"],
    publicRoutes: ["/", "/og-img-gen", "/hyperscaler-services"],
    bindings: ["LANDING", "OG_IMG_GEN", "HYPERSCALER_SERVICES"],
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
  hyperscalerStandalone: {
    worker: "hyperscaler-services",
    domains: ["hyperscalers.jfa.dev"],
    publicRoutes: ["/"],
    basePath: "/",
  },
  hyperscalerMounted: {
    worker: "hyperscaler-services-mounted",
    domains: [],
    publicRoutes: ["/hyperscaler-services/*"],
    basePath: "/hyperscaler-services",
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
    ],
    notes: [
      "booru.satuya.com remains outside this stack until its tBCProject owner is migrated.",
    ],
  },
} as const;
