import type { ServiceSearchScope } from "@/lib/service-search";

export interface PageTranslations {
  title: string;
  titleSmol: string;
  subtitle: string;
  services: string;
  providers: string;
  categories: string;
  search: string;
  clearSearch: string;
  searchApply: string;
  searchDescription: string;
  searchNoResults: string;
  searchPlaceholder: string;
  searchResults: (count: number) => string;
  filteredResults: (count: number) => string;
  searchScopeHint: (scope: ServiceSearchScope) => string;
  categoryColumn: string;
  awsColumn: string;
  azureColumn: string;
  gcpColumn: string;
  oracleColumn: string;
  cloudflareColumn: string;
  descriptionColumn: string;
  sourceCode: string;
}

export const translations: PageTranslations = {
  title: "HYPERSCALER SERVICES",
  titleSmol: "HYPERSCALERS",
  subtitle: "A directory of equivalent cloud services",
  services: "Services",
  providers: "Providers",
  categories: "Categories",
  search: "Search",
  clearSearch: "Clear search",
  searchApply: "Apply",
  searchDescription: "Type a service, provider, or category.",
  searchNoResults: "No services found.",
  searchPlaceholder: "S3, compute, Cloudflare...",
  searchResults: (count) => `${count} ${count === 1 ? "result" : "results"}`,
  filteredResults: (count) => `${count} matching ${count === 1 ? "service" : "services"}`,
  searchScopeHint: (scope) => {
    if (scope === "provider") {
      return "Choose a provider or continue typing after provider:.";
    }
    if (scope === "category") {
      return "Choose a category or continue typing after category:.";
    }
    return "Continue typing after service: to find a service.";
  },
  categoryColumn: "Category",
  awsColumn: "AWS",
  azureColumn: "Azure",
  gcpColumn: "GCP",
  oracleColumn: "Oracle",
  cloudflareColumn: "Cloudflare",
  descriptionColumn: "Description",
  sourceCode: "Source code",
};
