import { cn } from "../../lib/utils";
import type { WebPackage } from "../../web-packages";

import { Button, buttonVariants } from "./button";
import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { Kbd, KbdGroup } from "./kbd";
import { ThemeToggle } from "./theme-toggle";

import { ArrowUpRight, ChevronDown, Home } from "lucide-react";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Menu as MenuPrimitive, Popover as PopoverPrimitive } from "react-aria-components";

export interface SiteHeaderProps extends Omit<ComponentProps<"header">, "title"> {
  /** The full title displayed on larger screens. */
  title: string;
  /** The shorter title displayed on small screens. Defaults to `title`. */
  titleSmol?: string;
  /**
   * The descriptive text displayed beside the title on larger screens.
   * Defaults to the active package's tagline from `packages`.
   */
  subtitle?: ReactNode;
  /** An optional URL for making the brand link back to the application. */
  titleHref?: string;
  /**
   * The web packages offered by the brand switcher. When provided, the brand
   * title becomes a dropdown listing every package with its mounted routes.
   */
  packages?: WebPackage[];
  /**
   * When set, the package with this mount path is excluded from the brand
   * switcher dropdown — the current package should not link to itself.
   */
  activePackagePath?: string;
  /** The accessible name for the header navigation. */
  navLabel: string;
  /**
   * The app's source folder on GitHub. Listed at the bottom of the brand
   * switcher; shown as a header action only when there is no switcher.
   */
  githubHref?: string;
  /** App-specific actions, rendered left of the divider and the theme toggle. */
  children?: ReactNode;
}

/** Home URL of the package mounted at `path`, with a trailing slash. */
function packageHomeHref(path?: string): string {
  return path && path !== "/" ? `${path.replace(/\/+$/, "")}/` : "/";
}

/** Shared shell for the headers used by the web applications. */
export function SiteHeader({
  activePackagePath,
  children,
  className,
  githubHref,
  navLabel,
  packages,
  subtitle: subtitleProp,
  title,
  titleHref,
  titleSmol = title,
  ...props
}: SiteHeaderProps) {
  const activePackage = packages?.find((pkg) => pkg.path === activePackagePath);
  const subtitle = subtitleProp ?? activePackage?.tagline;
  const homeHref = packageHomeHref(activePackagePath);
  const showHomeLink = activePackage?.showHomeLink ?? false;

  const brandBody = (
    <>
      <span className="shrink-0 text-sm font-bold tracking-tight text-primary">
        <span className="hidden sm:inline">/{title}</span>
        <span className="inline sm:hidden">/{titleSmol}</span>
        <span className="hidden pl-0.5 text-xs tracking-tight sm:inline">by JFA</span>
      </span>
      {subtitle ? (
        <span className="hidden text-xs text-muted-foreground/75 sm:inline">/</span>
      ) : null}
      {subtitle ? (
        <span className="hidden truncate text-xs text-muted-foreground sm:inline">{subtitle}</span>
      ) : null}
    </>
  );

  let brand: ReactNode;
  if (packages && packages.length > 0) {
    const filteredPackages = activePackagePath
      ? packages.filter((pkg) => pkg.path !== activePackagePath)
      : packages;
    brand = (
      <PackageSwitcher
        ariaLabel={`${title} by JFA`}
        githubHref={githubHref}
        packages={filteredPackages}
        subtitle={subtitle}
        title={title}
        titleSmol={titleSmol}
      />
    );
  } else {
    brand = (
      <div
        aria-label={`${title} by JFA`}
        className="flex min-w-0 items-baseline gap-3 truncate lg:pr-4"
      >
        {brandBody}
      </div>
    );
    if (titleHref) {
      brand = (
        <a href={titleHref} className="min-w-0 cursor-pointer text-sm text-foreground no-underline">
          {brand}
        </a>
      );
    }
  }

  return (
    <header
      className={cn(
        "site-header sticky top-0 z-30 shrink-0 border-b border-border bg-background",
        className,
      )}
      {...props}
    >
      <div className="header-gutters flex min-h-11 items-center justify-between gap-4 sm:gap-6 lg:gap-8">
        <div className="flex min-w-0 items-center gap-1">
          {showHomeLink ? (
            <a
              href={homeHref}
              aria-label="Home"
              className={buttonVariants({
                className: "text-muted-foreground hover:text-foreground",
                size: "icon-lg",
                variant: "ghost",
              })}
            >
              <Home aria-hidden="true" />
            </a>
          ) : null}
          {brand}
        </div>

        <HeaderActions githubHref={packages?.length ? undefined : githubHref} navLabel={navLabel}>
          {children}
        </HeaderActions>
      </div>
    </header>
  );
}

/**
 * App actions, then a divider, then site-wide controls. `githubHref` is only
 * passed when the header has no switcher to list the source link in.
 */
function HeaderActions({
  children,
  githubHref,
  navLabel,
}: {
  children?: ReactNode;
  githubHref?: string;
  navLabel: string;
}) {
  return (
    <nav className="flex shrink-0 items-center gap-1" aria-label={navLabel}>
      {children}
      {githubHref ? (
        <a
          href={githubHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          className={buttonVariants({
            className: "text-muted-foreground hover:text-foreground",
            size: "icon-lg",
            variant: "ghost",
          })}
        >
          <GitHubMark className="size-4" />
        </a>
      ) : null}
      {/* App actions on the left; site-wide controls on the right. */}
      {children || githubHref ? (
        <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-border sm:mx-1.5" />
      ) : null}
      <ThemeToggle />
    </nav>
  );
}

/** GitHub's mark; lucide no longer ships brand icons. */
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
    </svg>
  );
}

interface PackageSwitcherProps {
  ariaLabel: string;
  githubHref?: string;
  packages: WebPackage[];
  subtitle?: ReactNode;
  title: string;
  titleSmol: string;
}

/**
 * Brand typography shared by the switcher trigger and its menu items so both
 * render at the same size, kerning, and weight. "by JFA" stays on the trigger
 * only; dropdown rows show the package title and tagline alone.
 *
 * When `viewportAware`, the trigger drops the slash and subtitle below `lg` so
 * a fixed-width trigger never ellipsizes those extras. "by JFA" stays visible.
 */
function PackageBrand({
  showByJfa = false,
  subtitle,
  title,
  viewportAware = false,
}: {
  showByJfa?: boolean;
  subtitle?: ReactNode;
  title: string;
  viewportAware?: boolean;
}) {
  const subtitleClass = viewportAware ? "hidden lg:inline" : undefined;

  return (
    <span className="flex min-w-0 items-baseline gap-3 truncate font-sans">
      <span className="shrink-0 text-sm font-bold tracking-tight whitespace-nowrap text-primary">
        /{title}
        {showByJfa ? <span className="pl-0.5 text-xs font-bold tracking-tight">by JFA</span> : null}
      </span>
      {subtitle ? (
        <span
          className={cn(
            "shrink-0 text-xs font-normal tracking-normal text-muted-foreground/75",
            subtitleClass,
          )}
        >
          /
        </span>
      ) : null}
      {subtitle ? (
        <span
          className={cn(
            "truncate text-xs font-normal tracking-normal text-muted-foreground",
            subtitleClass,
          )}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}

/** Brand switcher rendered in place of the plain title when packages are provided. */
function PackageSwitcher({
  ariaLabel,
  githubHref,
  packages,
  subtitle,
  title,
  titleSmol,
}: PackageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMac = /Mac|iPhone|iPad/.test(globalThis.navigator?.userAgent ?? "");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.code === "KeyU"
      ) {
        event.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <DropdownMenuTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        aria-label={ariaLabel}
        variant="ghost"
        className="-ml-1 h-auto min-w-0 shrink justify-start gap-1.5 px-1 py-0.5 text-sm font-bold tracking-tight whitespace-nowrap text-primary hover:text-primary dark:hover:text-primary [&_svg:not([class*='size-'])]:size-3"
      >
        <span className="hidden min-w-0 sm:flex">
          <PackageBrand showByJfa viewportAware subtitle={subtitle} title={title} />
        </span>
        <span className="flex min-w-0 sm:hidden">
          <PackageBrand showByJfa viewportAware title={titleSmol} />
        </span>
        <ChevronDown aria-hidden="true" className="shrink-0 opacity-70" />
      </Button>
      <PopoverPrimitive
        placement="bottom start"
        offset={4}
        crossOffset={0}
        className={cn(
          "z-50 w-(--trigger-width) min-w-32 origin-(--trigger-anchor-point) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:overflow-hidden data-exiting:fade-out-0 data-exiting:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2",
          "w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] sm:w-max sm:min-w-(--trigger-width) sm:max-w-[min(40rem,calc(100vw-16px))]",
        )}
      >
        <MenuPrimitive className="max-h-[inherit] overflow-x-hidden overflow-y-auto outline-hidden">
          {packages.map((pkg) => (
            <DropdownMenuItem
              key={pkg.path}
              href={pkg.path === "/" ? "/" : `${pkg.path}/`}
              textValue={`${pkg.title} ${pkg.tagline}`}
            >
              <PackageBrand subtitle={pkg.tagline} title={pkg.title} />
            </DropdownMenuItem>
          ))}
          {githubHref ? <DropdownMenuSeparator /> : null}
          {githubHref ? (
            <DropdownMenuItem
              href={githubHref}
              target="_blank"
              rel="noopener noreferrer"
              textValue={`${title} source on GitHub`}
            >
              <GitHubMark className="size-3.5" />
              <span>{title} source on GitHub</span>
              <ArrowUpRight aria-hidden="true" className="ml-auto size-3.5 text-muted-foreground" />
            </DropdownMenuItem>
          ) : null}
        </MenuPrimitive>
        <div className="hidden items-center justify-between gap-4 border-t border-border px-2 pt-1.5 pb-1 text-xs text-muted-foreground sm:flex">
          <span>Switch app</span>
          <KbdGroup>
            <Kbd size="xs" variant="embedded">
              {isMac ? "⌘" : "Ctrl"}
            </Kbd>
            <Kbd size="xs" variant="embedded">
              ⇧
            </Kbd>
            <Kbd size="xs" variant="embedded">
              U
            </Kbd>
          </KbdGroup>
        </div>
      </PopoverPrimitive>
    </DropdownMenuTrigger>
  );
}
