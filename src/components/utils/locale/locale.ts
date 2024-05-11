function getLocaleFromHeaders(acceptLanguageHeader: string | null): string {
  // Define your supported locales
  const supportedLocales = ['en', 'fr', 'es', 'de']; // Add or remove locales as needed

  // Default locale if no suitable one is found
  const defaultLocale = 'es';

  // Check if the header is present
  if (!acceptLanguageHeader) {
    return defaultLocale;
  }

  // Parse the Accept-Language header and sort by quality factor
  const parsedLocales = acceptLanguageHeader
    .split(',')
    .map((l) => {
      const [locale, qValue] = l.split(';q=');
      return { locale: locale.trim(), qValue: qValue ? parseFloat(qValue) : 1.0 };
    })
    .sort((a, b) => b.qValue - a.qValue);

  // Try to find the best match
  for (const { locale } of parsedLocales) {
    const lowerCaseLocale = locale.toLowerCase().split('-')[0]; // Convert to lower case and take the language part
    if (supportedLocales.includes(lowerCaseLocale)) {
      return lowerCaseLocale;
    }
  }

  // Return the default locale if no match is found
  return defaultLocale;
}

export { getLocaleFromHeaders };
