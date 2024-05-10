export function isLocaleInList(languageCodes: string[]): boolean {
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

export const supportedLanguages: string[] = ["es-ES", "es-419", "es", "en-US", "en-GB", "en"];