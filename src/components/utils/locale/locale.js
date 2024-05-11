export function isLocaleInList(languageCodes) {
  const userLocale = (navigator.languages ? navigator.languages[0] : navigator.language).toLowerCase();
  let langSupported = false;

  for (const code of languageCodes) {
    if (userLocale === code) {
      langSupported = true;
      break;
    }
  }

  return langSupported;
}

export const supportedLanguages = ["es-ES", "es-419", "es", "en-US", "en-GB", "en"];