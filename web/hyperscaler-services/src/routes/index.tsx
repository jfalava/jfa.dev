import { preferenceCookies, readPreference, writePreference } from "@jfa.dev/common/preferences";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ArrowUpRightIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { ServiceSearchPalette } from "@/components/service-search-palette";
import { ServicesTable } from "@/components/services-table";
import { ThemeToggle } from "@/components/theme-toggle";
import serviceSearchArtifact from "@/data/service-search-index.json";
import { importServices, serviceProviders, type ServiceProvider } from "@/data/services";
import {
  hydrateServiceSearchIndex,
  type SerializedServiceSearchIndex,
  type ServiceSearchIndex,
  type ServiceSearchScope,
} from "@/lib/service-search";

const getServices = createServerFn({
  method: "GET",
}).handler(async () => await importServices());

type LanguageCode = "en" | "es";

interface PageTranslations {
  title: string;
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

const translations = {
  en: {
    title: "HYPERSCALER SERVICES",
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

const isLanguageCode = (value: string | undefined): value is LanguageCode =>
  value === "en" || value === "es";

interface SearchParams {
  lang?: string;
  q?: string;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: SearchParams) => ({
    lang: isLanguageCode(search.lang) ? search.lang : undefined,
    q: search.q ? search.q : undefined,
  }),
  loader: async () => await getServices(),
  component: Home,
});

/** Renders the compact utility header used by the services catalog. */
function CatalogHeader({
  activeQuery,
  currentLang,
  onClearQuery,
  onSelectProvider,
  searchIndex,
  services,
  t,
}: {
  activeQuery: string;
  currentLang: LanguageCode;
  onClearQuery: () => void;
  onSelectProvider: (provider: ServiceProvider) => void;
  searchIndex: ServiceSearchIndex;
  services: Awaited<ReturnType<typeof importServices>>;
  t: PageTranslations;
}) {
  return (
    <header className="catalog-header shrink-0 border-b border-border bg-background">
      <div className="flex min-h-11 items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:gap-8">
        <div
          aria-label={t.title}
          className="flex min-w-0 cursor-default items-baseline gap-3 truncate lg:pr-4"
        >
          <span className="shrink-0 text-sm font-bold tracking-wide text-primary">
            <span className="inline">{t.title}</span>
            <span className="hidden pl-0.5 text-xs tracking-tight sm:inline">by JFA</span>
          </span>
          <span className="hidden text-[11px] text-muted-foreground/75 sm:inline">/</span>
          <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
            {t.subtitle}
          </span>
        </div>

        <nav className="flex shrink-0 items-center gap-1" aria-label="Catalog navigation">
          <ServiceSearchPalette
            activeQuery={activeQuery}
            currentLang={currentLang}
            presetQuery="service:"
            searchIndex={searchIndex}
            services={services}
            shortcutEnabled={false}
            triggerLabel={t.services}
            translations={t}
          />
          <ServiceSearchPalette
            activeQuery={activeQuery}
            currentLang={currentLang}
            presetQuery="provider:"
            searchIndex={searchIndex}
            services={services}
            shortcutEnabled={false}
            triggerLabel={t.providers}
            translations={t}
            onSelectProvider={onSelectProvider}
            hideOnMobile
          />
          <ServiceSearchPalette
            activeQuery={activeQuery}
            currentLang={currentLang}
            presetQuery="category:"
            searchIndex={searchIndex}
            services={services}
            shortcutEnabled={false}
            triggerLabel={t.categories}
            translations={t}
            hideOnMobile
          />
          <ServiceSearchPalette
            activeQuery={activeQuery}
            currentLang={currentLang}
            searchIndex={searchIndex}
            services={services}
            translations={t}
          />
          {activeQuery ? (
            <button
              type="button"
              onClick={onClearQuery}
              aria-label={t.clearSearch}
              title={t.clearSearch}
              className="inline-flex h-7 max-w-44 shrink-0 items-center gap-1 rounded-md border border-primary/30 px-2 text-[11px] text-primary transition-colors outline-none hover:bg-primary/10 hover:text-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="truncate">{activeQuery}</span>
              <X className="size-3.5 shrink-0" />
            </button>
          ) : null}
          <LanguageToggle currentLang={currentLang} />
          <ThemeToggle />
          <a
            href="https://github.com/jfalava/hyperscaler-services"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1 rounded-md bg-action px-2.5 py-1.5 text-[11px] font-medium text-action-foreground transition-opacity hover:bg-action/80 lg:inline-flex"
          >
            <svg
              className="text-action-foreground"
              fill="currentColor"
              viewBox="0 -0.5 25 25"
              height="16"
              width="16"
            >
              <g id="SVGRepo_iconCarrier">
                <path d="m12.301 0h.093c2.242 0 4.34.613 6.137 1.68l-.055-.031c1.871 1.094 3.386 2.609 4.449 4.422l.031.058c1.04 1.769 1.654 3.896 1.654 6.166 0 5.406-3.483 10-8.327 11.658l-.087.026c-.063.02-.135.031-.209.031-.162 0-.312-.054-.433-.144l.002.001c-.128-.115-.208-.281-.208-.466 0-.005 0-.01 0-.014v.001q0-.048.008-1.226t.008-2.154c.007-.075.011-.161.011-.249 0-.792-.323-1.508-.844-2.025.618-.061 1.176-.163 1.718-.305l-.076.017c.573-.16 1.073-.373 1.537-.642l-.031.017c.508-.28.938-.636 1.292-1.058l.006-.007c.372-.476.663-1.036.84-1.645l.009-.035c.209-.683.329-1.468.329-2.281 0-.045 0-.091-.001-.136v.007c0-.022.001-.047.001-.072 0-1.248-.482-2.383-1.269-3.23l.003.003c.168-.44.265-.948.265-1.479 0-.649-.145-1.263-.404-1.814l.011.026c-.115-.022-.246-.035-.381-.035-.334 0-.649.078-.929.216l.012-.005c-.568.21-1.054.448-1.512.726l.038-.022-.609.384c-.922-.264-1.981-.416-3.075-.416s-2.153.152-3.157.436l.081-.02q-.256-.176-.681-.433c-.373-.214-.814-.421-1.272-.595l-.066-.022c-.293-.154-.64-.244-1.009-.244-.124 0-.246.01-.364.03l.013-.002c-.248.524-.393 1.139-.393 1.788 0 .531.097 1.04.275 1.509l-.01-.029c-.785.844-1.266 1.979-1.266 3.227 0 .025 0 .051.001.076v-.004c-.001.039-.001.084-.001.13 0 .809.12 1.591.344 2.327l-.015-.057c.189.643.476 1.202.85 1.693l-.009-.013c.354.435.782.793 1.267 1.062l.022.011c.432.252.933.465 1.46.614l.046.011c.466.125 1.024.227 1.595.284l.046.004c-.431.428-.718 1-.784 1.638l-.001.012c-.207.101-.448.183-.699.236l-.021.004c-.256.051-.549.08-.85.08-.022 0-.044 0-.066 0h.003c-.394-.008-.756-.136-1.055-.348l.006.004c-.371-.259-.671-.595-.881-.986l-.007-.015c-.198-.336-.459-.614-.768-.827l-.009-.006c-.225-.169-.49-.301-.776-.38l-.016-.004-.32-.048c-.023-.002-.05-.003-.077-.003-.14 0-.273.028-.394.077l.007-.003q-.128.072-.08.184c.039.086.087.16.145.225l-.001-.001c.061.072.13.135.205.19l.003.002.112.08c.283.148.516.354.693.603l.004.006c.191.237.359.505.494.792l.01.024.16.368c.135.402.38.738.7.981l.005.004c.3.234.662.402 1.057.478l.016.002c.33.064.714.104 1.106.112h.007c.045.002.097.002.15.002.261 0 .517-.021.767-.062l-.027.004.368-.064q0 .609.008 1.418t.008.873v.014c0 .185-.08.351-.208.466h-.001c-.119.089-.268.143-.431.143-.075 0-.147-.011-.214-.032l.005.001c-4.929-1.689-8.409-6.283-8.409-11.69 0-2.268.612-4.393 1.681-6.219l-.032.058c1.094-1.871 2.609-3.386 4.422-4.449l.058-.031c1.739-1.034 3.835-1.645 6.073-1.645h.098-.005zm-7.64 17.666q.048-.112-.112-.192-.16-.048-.208.032-.048.112.112.192.144.096.208-.032zm.497.545q.112-.08-.032-.256-.16-.144-.256-.048-.112.08.032.256.159.157.256.047zm.48.72q.144-.112 0-.304-.128-.208-.272-.096-.144.08 0 .288t.272.112zm.672.673q.128-.128-.064-.304-.192-.192-.32-.048-.144.128.064.304.192.192.32.044zm.913.4q.048-.176-.208-.256-.24-.064-.304.112t.208.24q.24.097.304-.096zm1.009.08q0-.208-.272-.176-.256 0-.256.176 0 .208.272.176.256.001.256-.175zm.929-.16q-.032-.176-.288-.144-.256.048-.224.24t.288.128.225-.224z"></path>
              </g>
            </svg>
            <ArrowUpRightIcon className="size-3" />
          </a>
        </nav>
      </div>
    </header>
  );
}

/** Main services catalog page. */
function Home() {
  const services = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const { lang, q } = useSearch({ from: "/" });
  const [cookieLang, setCookieLang] = useState<LanguageCode>("en");
  const currentLang = lang ?? cookieLang;
  const activeQuery = q ?? "";
  const t = translations[currentLang];

  useEffect(() => {
    if (lang !== undefined) {
      writePreference(preferenceCookies.language, lang);
      setCookieLang(lang);
      return;
    }

    const savedLanguage = readPreference(preferenceCookies.language);
    if (isLanguageCode(savedLanguage)) {
      setCookieLang(savedLanguage);
    }
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  const searchIndex = useMemo(
    () =>
      hydrateServiceSearchIndex(services, serviceSearchArtifact as SerializedServiceSearchIndex),
    [services],
  );

  const clearQuery = (): void => {
    void navigate({
      to: "/",
      search: (previous) => ({
        ...previous,
        q: undefined,
      }),
    });
  };

  const selectProvider = (provider: ServiceProvider): void => {
    const label = serviceProviders.find(({ key }) => key === provider)?.label ?? provider;

    void navigate({
      to: "/",
      search: (previous) => ({
        ...previous,
        lang: currentLang,
        q: `provider:${label}`,
      }),
    });
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <CatalogHeader
        activeQuery={activeQuery}
        currentLang={currentLang}
        onClearQuery={clearQuery}
        onSelectProvider={selectProvider}
        searchIndex={searchIndex}
        services={services}
        t={t}
      />
      <main id="services" className="catalog-main min-h-0 flex-1 overflow-hidden">
        <ServicesTable
          translations={t}
          currentLang={currentLang}
          searchQuery={activeQuery}
          searchIndex={searchIndex}
        />
      </main>
    </div>
  );
}
