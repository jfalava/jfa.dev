interface RedirectEntry {
  in: string; // Base hostname to match
  out: string; // Base destination hostname (with protocol)
  preserveSubdomain?: boolean;
}

export const redirects: RedirectEntry[] = [
  { in: "cv.jfa.dev", out: "jfa.dev" },
  { in: "landing.jfa.dev", out: "jfa.dev" },
  { in: "jfalava.ovh", out: "jfa.dev" },
  { in: "www.jfalava.ovh", out: "jfa.dev" },
  { in: "cv.jfalava.eu", out: "jfa.dev" },
  { in: "www.jfa.dev", out: "jfa.dev" },
  {
    in: "link-shortener.jfa.ovh",
    out: "https://github.com/jfalava/link-shortener",
  },
  { in: "links.jfa.ovh", out: "https://github.com/jfalava/link-shortener" },
  { in: "links.jfa.dev", out: "https://github.com/jfalava/link-shortener" },
  { in: "link.jfa.dev", out: "https://github.com/jfalava/link-shortener" },
];
