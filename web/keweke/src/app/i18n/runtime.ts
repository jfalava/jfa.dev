import { preferenceCookies, writePreference } from "@jfa.dev/common/preferences";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { IntlVariations, setupFbtee, type TranslationDictionary } from "fbtee";

import { type KewekeLocale, negotiateLocale, SOURCE_LOCALE, SUPPORTED_LOCALES } from "./locales";

// The fbtee Vite plugin in vite.config.ts compiles translations/*.json into
// these runtime catalogs at build and dev-server start. They are not committed.
const catalogs = import.meta.glob<TranslationDictionary>("../../translations/*.json", {
  eager: true,
  import: "default",
});

const requestLocales = new WeakMap<Request, KewekeLocale>();

/**
 * The locale of the current render. The server negotiates it per request
 * from the locale cookie and Accept-Language; the browser reads the
 * `<html lang>` that the server rendered, so hydration uses the same strings.
 */
export const getLocale = createIsomorphicFn()
  .server((): KewekeLocale => {
    const request = getRequest();
    let locale = requestLocales.get(request);
    if (!locale) {
      locale = negotiateLocale(
        request.headers.get("cookie"),
        request.headers.get("accept-language"),
      );
      requestLocales.set(request, locale);
    }
    return locale;
  })
  .client(
    (): KewekeLocale =>
      SUPPORTED_LOCALES.find((locale) => locale === document.documentElement.lang) ?? SOURCE_LOCALE,
  );

const translations: TranslationDictionary = {};
for (const catalog of Object.values(catalogs)) {
  Object.assign(translations, catalog);
}

setupFbtee({
  sourceLocale: SOURCE_LOCALE,
  translations,
  hooks: {
    getViewerContext: () => ({ GENDER: IntlVariations.GENDER_UNKNOWN, locale: getLocale() }),
  },
});

/** Saves `locale` as the user's jfa.dev language and reloads to render it. */
export function changeLocale(locale: KewekeLocale) {
  writePreference(preferenceCookies.language, locale);
  window.location.reload();
}
