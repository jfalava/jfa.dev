import { preferenceCookies } from "@jfa.dev/common/preferences";

/**
 * Locales Keweke ships translations for. English is the source language of
 * every `<fbt>` string; Spanish and Catalan come from `translations/*.json`.
 */
export const SUPPORTED_LOCALES = ["en-US", "es-ES", "ca-ES"] as const;
export type KewekeLocale = (typeof SUPPORTED_LOCALES)[number];

export const SOURCE_LOCALE: KewekeLocale = "en-US";

/** Each locale named in its own language, for the language picker. */
export const LOCALE_NAMES = {
  "en-US": "English",
  "es-ES": "Español",
  "ca-ES": "Català",
} satisfies Record<KewekeLocale, string>;

/** The supported locale for a BCP 47 tag, matched on its language subtag. */
function matchLanguage(tag: string): KewekeLocale | undefined {
  const language = tag.trim().split(/[-_]/)[0]?.toLowerCase();
  return SUPPORTED_LOCALES.find((locale) => locale.split("-")[0] === language);
}

function readCookie(cookieHeader: string | null, name: string): string | undefined {
  for (const part of cookieHeader?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator !== -1 && part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return undefined;
}

/** Accept-Language tags ordered by quality, highest first, without `q=0` tags. */
function acceptedLanguages(acceptLanguage: string | null): string[] {
  return (acceptLanguage ?? "")
    .split(",")
    .map((entry, index) => {
      const [tag = "", ...params] = entry.split(";");
      const quality = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      return { index, tag: tag.trim(), q: quality ? Number(quality.slice(2)) : 1 };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.q > 0)
    .toSorted((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.tag);
}

/**
 * Picks the locale for a request: the language saved in the shared
 * `jfa-language` cookie, else the first browser language Keweke supports,
 * else English. Both match on the language subtag, so `es` picks `es-ES`.
 */
export function negotiateLocale(
  cookieHeader: string | null,
  acceptLanguage: string | null,
): KewekeLocale {
  const saved = readCookie(cookieHeader, preferenceCookies.language);
  const savedLocale = saved === undefined ? undefined : matchLanguage(saved);
  if (savedLocale) {
    return savedLocale;
  }
  for (const tag of acceptedLanguages(acceptLanguage)) {
    const locale = matchLanguage(tag);
    if (locale) {
      return locale;
    }
  }
  return SOURCE_LOCALE;
}
