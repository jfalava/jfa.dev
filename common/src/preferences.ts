import Cookies from "js-cookie";

export const preferenceCookies = {
  language: "jfa-language",
  theme: "jfa-theme",
  wrapText: "jfa-wrap-text",
} as const;

export type PreferenceCookieName =
  (typeof preferenceCookies)[keyof typeof preferenceCookies];

const COOKIE_LIFETIME_DAYS = 365;

function canUseCookies(): boolean {
  return globalThis.document !== undefined;
}

function cookieAttributes() {
  const attributes = {
    expires: COOKIE_LIFETIME_DAYS,
    path: "/",
    sameSite: "lax" as const,
  };

  if (
    globalThis.location !== undefined &&
    globalThis.location.protocol === "https:"
  ) {
    return { ...attributes, secure: true };
  }

  return attributes;
}

export function readPreference(name: PreferenceCookieName): string | undefined {
  return canUseCookies() ? Cookies.get(name) : undefined;
}

export function writePreference(
  name: PreferenceCookieName,
  value: string,
): void {
  if (canUseCookies()) {
    Cookies.set(name, value, cookieAttributes());
  }
}

export function removePreference(name: PreferenceCookieName): void {
  if (canUseCookies()) {
    Cookies.remove(name, { path: "/" });
  }
}
