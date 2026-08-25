import { SiteHeader } from "@jfa.dev/common/ui";
import { webPackages } from "@jfa.dev/common/web-packages";
import { X } from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import { ServiceSearchPalette } from "@/components/service-search-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { importServices } from "@/data/services";
import type { LanguageCode, PageTranslations } from "@/features/catalog/lib/translations";
import type { ServiceSearchIndex } from "@/lib/service-search";

/** Renders the compact utility header used by the services catalog. */
export function CatalogHeader({
  activeQuery,
  currentLang,
  onClearQuery,
  searchIndex,
  services,
  t,
}: {
  activeQuery: string;
  currentLang: LanguageCode;
  onClearQuery: () => void;
  searchIndex: ServiceSearchIndex;
  services: Awaited<ReturnType<typeof importServices>>;
  t: PageTranslations;
}) {
  return (
    <SiteHeader
      title={t.title}
      titleSmol={t.titleSmol}
      subtitle={t.subtitle}
      packages={webPackages}
      activePackagePath="/hyperscaler-services"
      navLabel="Catalog navigation"
      githubHref="https://github.com/jfalava/jfa.dev/tree/main/web/hyperscaler-services"
    >
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
          className="inline-flex h-8 max-w-44 shrink-0 items-center gap-1 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <span className="truncate">{activeQuery}</span>
          <X className="size-4 shrink-0" />
        </button>
      ) : null}
      <LanguageToggle currentLang={currentLang} />
      <ThemeToggle />
    </SiteHeader>
  );
}
