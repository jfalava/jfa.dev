/**
 * HTMLElement with dataset properties for service rows.
 */
export interface HTMLElementWithDataset extends HTMLElement {
  dataset: {
    category: string;
    aws: string;
    azure: string;
    gcp: string;
    oracle: string;
    cloudflare: string;
    description: string;
    matches?: string;
  };
}

/**
 * Pagination text translations.
 */
export interface PaginationTranslations {
  showing: string;
  of: string;
  services: string;
}
