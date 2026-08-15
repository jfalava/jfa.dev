import {
  Button,
  Dialog,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@jfa.dev/common/ui";
import { useNavigate } from "@tanstack/react-router";
import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { serviceProviders, type ServiceMapping, type ServiceProvider } from "@/data/services";
import {
  parseServiceSearchQuery,
  searchServiceIndex,
  type ServiceSearchIndex,
  type ServiceSearchScope,
} from "@/lib/service-search";
import { cn } from "@/lib/utils";

interface ServiceSearchTranslations {
  search: string;
  searchApply: string;
  searchDescription: string;
  searchNoResults: string;
  searchPlaceholder: string;
  searchResults: (count: number) => string;
  searchScopeHint: (scope: ServiceSearchScope) => string;
}

/** Props for the command-palette service search. */
interface ServiceSearchPaletteProps {
  /** The query currently applied to the table. */
  activeQuery: string;
  /** Language used for preview labels and descriptions. */
  currentLang: "en" | "es";
  /** Static catalog mappings used to render labels and suggestions. */
  services: ServiceMapping[];
  /** Search index generated from the catalog at build time. */
  searchIndex: ServiceSearchIndex;
  /** Localized copy for the search control and palette. */
  translations: ServiceSearchTranslations;
  /** Optional scoped query inserted when this preset opens the palette. */
  presetQuery?: string;
  /** Optional alternate label for a preset trigger. */
  triggerLabel?: string;
  /** Applies a provider selection immediately when a provider suggestion is clicked. */
  onSelectProvider?: (provider: ServiceProvider) => void;
  /** Whether Ctrl/⌘K should open this palette instance. */
  shortcutEnabled?: boolean;
  /** Hides this preset trigger below the small-screen breakpoint. */
  hideOnMobile?: boolean;
}

const previewLimit = 7;

interface SearchScopeSuggestion {
  label: string;
  query: string;
  provider?: ServiceProvider;
}

interface SearchPalettePreviewProps {
  currentLang: "en" | "es";
  hasEmptyScope: boolean;
  hasQuery: boolean;
  previewResults: readonly { service: ServiceMapping }[];
  scope?: ServiceSearchScope;
  scopeSuggestions: readonly SearchScopeSuggestion[];
  searchResultCount: number;
  onSelectSuggestion: (suggestion: SearchScopeSuggestion) => void;
  translations: ServiceSearchTranslations;
}

const previewProviders = [
  { label: "AWS", nameKey: "aws", urlKey: "awsUrl" },
  { label: "Azure", nameKey: "azure", urlKey: "azureUrl" },
  { label: "GCP", nameKey: "gcp", urlKey: "gcpUrl" },
  { label: "Oracle", nameKey: "oracle", urlKey: "oracleUrl" },
  { label: "Cloudflare", nameKey: "cloudflare", urlKey: "cloudflareUrl" },
] as const;

/** Renders one provider result while retaining its catalog documentation link. */
function SearchResultService({ label, name, url }: { label: string; name: string; url?: string }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1">
      <span className="shrink-0 text-[9px] font-medium tracking-wide text-muted-foreground/70 uppercase">
        {label}
      </span>
      {url && name !== "—" ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate underline decoration-dotted underline-offset-3 transition-colors hover:text-foreground hover:decoration-solid"
        >
          {name}
        </a>
      ) : (
        <span className={cn("truncate", name === "—" && "text-muted-foreground/45")}>{name}</span>
      )}
    </span>
  );
}

/** Renders the scoped suggestions or ranked service preview below the palette input. */
function SearchPalettePreview({
  currentLang,
  hasEmptyScope,
  hasQuery,
  previewResults,
  scope,
  scopeSuggestions,
  searchResultCount,
  onSelectSuggestion,
  translations,
}: SearchPalettePreviewProps) {
  return (
    <div className="max-h-[min(28rem,60vh)] overflow-y-auto" aria-live="polite">
      {hasEmptyScope ? (
        <div className="px-4 py-5">
          <div className="px-2.5 pb-3 text-xs text-muted-foreground">
            {scope && translations.searchScopeHint(scope)}
          </div>
          {scopeSuggestions.length > 0 && (
            <div className="grid gap-0.5">
              {scopeSuggestions.map((suggestion) => (
                <button
                  key={suggestion.query}
                  type="button"
                  className="flex items-center rounded-md px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
                  onClick={() => onSelectSuggestion(suggestion)}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : !hasQuery ? (
        <div className="px-4 py-10 text-center text-xs text-muted-foreground">
          {translations.searchDescription}
        </div>
      ) : searchResultCount === 0 ? (
        <div className="px-4 py-10 text-center text-xs text-muted-foreground">
          {translations.searchNoResults}
        </div>
      ) : (
        <>
          <div className="border-b border-border px-4 py-2 text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {translations.searchResults(searchResultCount)}
          </div>
          <div className="p-1.5">
            {previewResults.map(({ service }) => (
              <div key={`${service.category}-${service.aws}`} className="rounded-md px-2.5 py-2.5">
                <div className="truncate text-xs font-medium text-foreground">
                  {service.categoryName[currentLang]}
                </div>
                <div className="mt-1 grid gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                  {previewProviders.map(({ label, nameKey, urlKey }) => (
                    <SearchResultService
                      key={nameKey}
                      label={label}
                      name={service[nameKey]}
                      url={service[urlKey]}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            {translations.searchApply}
          </div>
        </>
      )}
    </div>
  );
}

/** Renders the search trigger and keyboard-first service search palette. */
export function ServiceSearchPalette({
  activeQuery,
  currentLang,
  services,
  searchIndex,
  translations,
  presetQuery,
  triggerLabel,
  onSelectProvider,
  shortcutEnabled = true,
  hideOnMobile = false,
}: ServiceSearchPaletteProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const initialQuery = presetQuery ?? activeQuery;
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const parsedQuery = useMemo(() => parseServiceSearchQuery(draftQuery), [draftQuery]);
  const searchResults = useMemo(
    () => (parsedQuery.queryTokens.length > 0 ? searchServiceIndex(searchIndex, draftQuery) : []),
    [draftQuery, parsedQuery.queryTokens.length, searchIndex],
  );
  const hasQuery = parsedQuery.queryTokens.length > 0;
  const hasEmptyScope = parsedQuery.scope !== undefined && !hasQuery;
  const activeScope = parsedQuery.scope;
  const previewResults = searchResults.slice(0, previewLimit);
  const scopeSuggestions = useMemo(() => {
    if (!hasEmptyScope || !parsedQuery.scope) {
      return [];
    }

    if (parsedQuery.scope === "provider") {
      return serviceProviders.map(({ key, label }) => ({
        label,
        provider: key,
        query: `provider:${label}`,
      }));
    }

    if (parsedQuery.scope === "category") {
      return [...new Set(services.map((service) => service.categoryName[currentLang]))].map(
        (label) => ({
          label,
          query: `category:${label}`,
        }),
      );
    }

    return [];
  }, [currentLang, hasEmptyScope, parsedQuery.scope, services]);

  const selectSuggestion = (suggestion: SearchScopeSuggestion): void => {
    if (suggestion.provider && onSelectProvider) {
      onSelectProvider(suggestion.provider);
      setOpen(false);
      return;
    }

    setDraftQuery(suggestion.query);
  };

  useEffect(() => {
    if (open) {
      setDraftQuery(initialQuery);
    }
  }, [initialQuery, open]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    if (shortcutEnabled) {
      window.addEventListener("keydown", handleShortcut);
    }

    return () => window.removeEventListener("keydown", handleShortcut);
  }, [shortcutEnabled]);

  const applySearch = (): void => {
    const nextQuery = draftQuery.trim();

    void navigate({
      to: "/",
      search: (previous) => ({
        ...previous,
        lang: currentLang,
        q: nextQuery || undefined,
      }),
    });
    setOpen(false);
  };

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="default"
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium text-primary transition-colors outline-none hover:bg-primary/10 hover:text-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
          presetQuery ? "border border-transparent" : "border border-border bg-background",
          hideOnMobile && "hidden sm:inline-flex",
        )}
        aria-label={triggerLabel ?? translations.search}
      >
        {presetQuery ? (
          <span>{triggerLabel}</span>
        ) : (
          <>
            <Search className="size-3.5" />
            <span className="hidden sm:inline">{translations.search}</span>
            <kbd className="hidden rounded-sm border border-border/70 px-1 text-[10px] font-normal text-muted-foreground md:inline-flex">
              ⌘K
            </kbd>
          </>
        )}
      </Button>
      <Dialog
        className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{translations.search}</DialogTitle>
        <DialogDescription className="sr-only">{translations.searchDescription}</DialogDescription>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applySearch();
              }
            }}
            placeholder={translations.searchPlaceholder}
            aria-label={translations.search}
            className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
          />
          <kbd className="hidden shrink-0 items-center gap-1 text-[10px] text-muted-foreground sm:inline-flex">
            <CornerDownLeft className="size-3" />
            {translations.searchApply}
          </kbd>
        </div>

        <SearchPalettePreview
          currentLang={currentLang}
          hasEmptyScope={hasEmptyScope}
          hasQuery={hasQuery}
          previewResults={previewResults}
          scope={activeScope}
          scopeSuggestions={scopeSuggestions}
          searchResultCount={searchResults.length}
          onSelectSuggestion={selectSuggestion}
          translations={translations}
        />
      </Dialog>
    </DialogTrigger>
  );
}
