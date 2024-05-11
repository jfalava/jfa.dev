export function isLocaleInList(userLocale: string, languageCodes: string[]): boolean {
  console.log("Received userLocale:", userLocale); // debug line

  let langSupported = false;
  const locale = userLocale ? userLocale.toLowerCase() : null;
  console.log("Processed locale:", locale);

  if (!locale) {
    console.log("Locale is undefined or not a string.");
    return false;
  }

  for (const code of languageCodes) {
    console.log("Checking against code:", code); // debug line
    if (locale === code.toLowerCase()) { // debug line
      langSupported = true;
      console.log("Locale supported:", code); // debug line
      break;
    }
  }

  console.log("Language supported:", langSupported); // debug line
  return langSupported;
}

export const supportedLanguages: string[] = ["es-ES", "es-419", "es", "en-US", "en-GB", "en"];
