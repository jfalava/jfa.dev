import {
  Button,
  Dialog,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Input,
  Kbd,
  KbdGroup,
} from "@jfa.dev/common/ui";
import { detectPlatform, formatForDisplay, useHotkey, useHotkeys } from "@tanstack/react-hotkeys";
import { useNavigate } from "@tanstack/react-router";
import { CornerDownLeft, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

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
  // Optional filter labels provided by PageTranslations (kept loose for backward compat)
  services?: string;
  providers?: string;
  categories?: string;
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
  /** Whether Ctrl/⌘K should open this palette instance. */
  shortcutEnabled?: boolean;
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

interface FilterConfig {
  scope: ServiceSearchScope;
  label: string;
  hotkey: string;
  queryPrefix: string;
}

// oxlint-disable-next-line eslint/no-empty-function
const subscribe = () => () => {};

function HotkeyKbd({
  hotkey,
  className,
  kbdClassName,
}: {
  hotkey: string;
  className?: string;
  kbdClassName?: string;
}) {
  const platform = useSyncExternalStore(subscribe, detectPlatform, () => "mac" as const);

  return (
    <KbdGroup className={className}>
      {formatForDisplay(hotkey, { platform, separatorToken: " " })
        .split(" ")
        .map((token) => (
          <Kbd key={token} className={kbdClassName}>
            {token}
          </Kbd>
        ))}
    </KbdGroup>
  );
}

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
  shortcutEnabled = true,
}: ServiceSearchPaletteProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState(activeQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const parsedQuery = useMemo(() => parseServiceSearchQuery(draftQuery), [draftQuery]);
  const searchResults = useMemo(
    () => (parsedQuery.queryTokens.length > 0 ? searchServiceIndex(searchIndex, draftQuery) : []),
    [draftQuery, parsedQuery.queryTokens.length, searchIndex],
  );
  const hasQuery = parsedQuery.queryTokens.length > 0;
  const hasEmptyScope = parsedQuery.scope !== undefined && !hasQuery;
  const activeScope = parsedQuery.scope;
  const previewResults = searchResults.slice(0, previewLimit);

  const filterConfigs: readonly FilterConfig[] = useMemo(
    () => [
      {
        scope: "service",
        label: translations.services ?? "Services",
        hotkey: "Mod+Shift+S",
        queryPrefix: "service:",
      },
      {
        scope: "provider",
        label: translations.providers ?? "Providers",
        hotkey: "Mod+Shift+P",
        queryPrefix: "provider:",
      },
      {
        scope: "category",
        label: translations.categories ?? "Categories",
        hotkey: "Mod+Shift+C",
        queryPrefix: "category:",
      },
    ],
    [translations.services, translations.providers, translations.categories],
  );

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
    setDraftQuery(suggestion.query);
    // keep focus on input so user can continue typing or press Enter
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const applyScope = useCallback(
    (scope: ServiceSearchScope) => {
      if (parsedQuery.scope === scope) {
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }

      const prefix = `${scope}:`;
      const term = parsedQuery.scope
        ? draftQuery.slice(draftQuery.indexOf(":") + 1).trim()
        : draftQuery.trim();
      // Preserve existing term when switching scopes; strip any existing scope prefix
      const nextQuery = term ? `${prefix}${term}` : prefix;
      setDraftQuery(nextQuery);
      setOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [draftQuery, parsedQuery.scope],
  );

  // Sync draft with active query when palette opens
  useEffect(() => {
    if (open) {
      // oxlint-disable-next-line react/set-state-in-effect
      setDraftQuery(activeQuery);
      // focus after open animation
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, activeQuery]);

  // Global open hotkey: Mod+K
  useHotkey(
    "Mod+K",
    () => {
      setDraftQuery(activeQuery);
      setOpen((prev) => !prev);
    },
    { enabled: shortcutEnabled },
  );

  // Per-filter hotkeys using TanStack Hotkeys (each with own keybind)
  useHotkeys(
    [
      {
        hotkey: "Mod+Shift+S",
        callback: () => applyScope("service"),
      },
      {
        hotkey: "Mod+Shift+P",
        callback: () => applyScope("provider"),
      },
      {
        hotkey: "Mod+Shift+C",
        callback: () => applyScope("category"),
      },
    ],
    // Allow Mod+Shift combos inside inputs (smart default already true for Mod combos)
    { enabled: true },
  );

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

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (!nextOpen) {
      // reset draft on close? keep activeQuery for next open
      setDraftQuery(activeQuery);
    }
  };

  return (
    <DialogTrigger isOpen={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="gap-1.5 rounded-md border border-border bg-background text-xs font-medium text-primary transition-colors outline-none hover:bg-primary/10 hover:text-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 sm:w-auto sm:gap-1.5 sm:px-2.5"
        aria-label={translations.search}
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">{translations.search}</span>
        <HotkeyKbd
          hotkey="Mod+K"
          className="hidden md:inline-flex"
          kbdClassName="h-5 min-h-0 px-1 text-[10px]"
        />
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
            ref={inputRef}
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

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
          {filterConfigs.map((filter) => {
            const isActive = activeScope === filter.scope;
            return (
              <button
                key={filter.scope}
                type="button"
                onClick={() => applyScope(filter.scope)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-pressed={isActive}
              >
                <span>{filter.label}</span>
                <HotkeyKbd
                  hotkey={filter.hotkey}
                  className="hidden sm:inline-flex"
                  kbdClassName={cn(
                    "h-5 min-h-0 px-1 text-[10px]",
                    isActive
                      ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                />
              </button>
            );
          })}
          {activeScope ? (
            <button
              type="button"
              onClick={() => {
                setDraftQuery("");
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear filter
            </button>
          ) : null}
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
