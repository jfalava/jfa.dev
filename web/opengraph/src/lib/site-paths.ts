function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export const appBasePath = normalizeBasePath(
  import.meta.env.VITE_BASE_PATH || import.meta.env.BASE_URL,
);

export function appPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (appBasePath === "/") {
    return normalizedPath;
  }

  return normalizedPath === "/" ? `${appBasePath}/` : `${appBasePath}${normalizedPath}`;
}
