interface MinimalRequest {
  headers: {
    get(name: string): string | null;
  };
}

import { getLocaleFromHeaders } from '@/components/utils/locale/locale.ts';

export async function get({ request }: { request: MinimalRequest }) {
  const acceptLanguageHeader = request.headers.get('accept-language');
  const locale = getLocaleFromHeaders(acceptLanguageHeader);
  return new Response(locale, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
