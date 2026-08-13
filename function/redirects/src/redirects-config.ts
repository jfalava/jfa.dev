interface RedirectEntry {
  in: string; // Base hostname to match
  out: string; // Base destination hostname (with protocol)
  pathPrefix?: string; // Optional destination path prefix
  preserveSubdomain?: boolean;
}

export const redirects: RedirectEntry[] = [
  { in: "jfalava.eu", out: "https://jfa.dev" },
  { in: "cv.jfalava.eu", out: "https://jfa.dev" },
  { in: "jfalava.ovh", out: "https://jfa.dev" },
  { in: "www.jfalava.ovh", out: "https://jfa.dev" },
  { in: "proyecto.jfalava.ovh", out: "https://jfa.dev" },
  { in: "downloads.jfalava.ovh", out: "https://jfa.dev" },
  { in: "jfa.ovh", out: "https://jfa.dev" },
  { in: "www.jfa.ovh", out: "https://jfa.dev" },
  { in: "links.jfa.ovh", out: "https://jfa.dev" },
  {
    in: "link-shortener.jfa.ovh",
    out: "https://jfa.dev",
  },
  { in: "cv.jfa.dev", out: "https://jfa.dev" },
  { in: "landing.jfa.dev", out: "https://jfa.dev" },
  { in: "www.jfa.dev", out: "https://jfa.dev" },
  { in: "links.jfa.dev", out: "https://jfa.dev" },
  { in: "link.jfa.dev", out: "https://jfa.dev" },
  {
    in: "hyperscalers.jfa.dev",
    out: "https://jfa.dev",
    pathPrefix: "/hyperscaler-services",
  },
  {
    in: "hyperscaler-services.jfa.dev",
    out: "https://jfa.dev",
    pathPrefix: "/hyperscaler-services",
  },
];
