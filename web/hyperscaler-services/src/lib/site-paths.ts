function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

/** The build-time base path used by Vite and TanStack Router. */
export const appBasePath = normalizeBasePath(import.meta.env.BASE_URL);

/** Resolves an app-owned URL under the configured deployment base path. */
export function appPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (appBasePath === "/") {
    return normalizedPath;
  }

  return normalizedPath === "/"
    ? `${appBasePath}/`
    : `${appBasePath}${normalizedPath}`;
}
