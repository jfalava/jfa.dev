import type { ServiceSearchScope } from "@/lib/service-search";

export type LanguageCode = "en" | "es";

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

export const translations = {
  en: {
    title: "HYPERSCALER SERVICES",
    titleSmol: "HYPERSCALERS",
    subtitle: "A directory of equivalent cloud services",
    services: "Services",
    providers: "Providers",
    categories: "Categories",
    search: "Search",
    clearSearch: "Clear search",
    searchApply: "Press Enter to apply",
    searchDescription: "Search equivalent services, providers, categories, and descriptions.",
    searchNoResults: "No services found.",
    searchPlaceholder: "Search services, providers, categories...",
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
    categoryColumn: "CATEGORY",
    awsColumn: "AWS",
    azureColumn: "AZURE",
    gcpColumn: "GCP",
    oracleColumn: "ORACLE",
    cloudflareColumn: "CLOUDFLARE",
    descriptionColumn: "DESCRIPTION",
    sourceCode: "Source code",
  },
  es: {
    title: "SERVICIOS de HIPERESCALARES",
    titleSmol: "HIPERESCALARES",
    subtitle: "Un directorio de servicios cloud equivalentes",
    services: "Servicios",
    providers: "Proveedores",
    categories: "Categorías",
    search: "Buscar",
    clearSearch: "Borrar búsqueda",
    searchApply: "Pulsa Enter para aplicar",
    searchDescription: "Busca servicios equivalentes, proveedores, categorías y descripciones.",
    searchNoResults: "No se encontraron servicios.",
    searchPlaceholder: "Buscar servicios, proveedores, categorías...",
    searchResults: (count) => `${count} ${count === 1 ? "resultado" : "resultados"}`,
    filteredResults: (count) =>
      `${count} ${count === 1 ? "servicio coincidente" : "servicios coincidentes"}`,
    searchScopeHint: (scope) => {
      if (scope === "provider") {
        return "Elige un proveedor o sigue escribiendo después de provider:.";
      }
      if (scope === "category") {
        return "Elige una categoría o sigue escribiendo después de category:.";
      }
      return "Sigue escribiendo después de service: para buscar un servicio.";
    },
    categoryColumn: "CATEGORÍA",
    awsColumn: "AWS",
    azureColumn: "AZURE",
    gcpColumn: "GCP",
    oracleColumn: "ORACLE",
    cloudflareColumn: "CLOUDFLARE",
    descriptionColumn: "DESCRIPCIÓN",
    sourceCode: "Código fuente",
  },
} satisfies Record<LanguageCode, PageTranslations>;

export const isLanguageCode = (value: string | undefined): value is LanguageCode =>
  value === "en" || value === "es";
