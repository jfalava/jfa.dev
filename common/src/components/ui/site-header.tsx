import { cn } from "../../lib/utils";
import type { WebPackage } from "../../web-packages";

import { Button, buttonVariants } from "./button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export interface SiteHeaderProps extends Omit<ComponentProps<"header">, "title"> {
  /** The full title displayed on larger screens. */
  title: string;
  /** The shorter title displayed on small screens. Defaults to `title`. */
  titleSmol?: string;
  /** The descriptive text displayed beside the title on larger screens. */
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
  /** The repository URL for the normalized GitHub action. */
  githubHref?: string;
  /** App-specific actions rendered before the shared GitHub action. */
  children?: ReactNode;
}

/** Shared shell for the headers used by the web applications. */
export function SiteHeader({
  activePackagePath,
  children,
  className,
  githubHref,
  navLabel,
  packages,
  subtitle,
  title,
  titleHref,
  titleSmol = title,
  ...props
}: SiteHeaderProps) {
  const brandBody = (
    <>
      <span className="shrink-0 text-sm font-bold tracking-tight text-primary">
        <span className="hidden sm:inline">/{title}</span>
        <span className="inline sm:hidden">/{titleSmol}</span>
        <span className="hidden pl-0.5 text-xs tracking-tight sm:inline">by JFA</span>
      </span>
      {subtitle ? (
        <span className="hidden text-[11px] text-muted-foreground/75 sm:inline">/</span>
      ) : null}
      {subtitle ? (
        <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
          {subtitle}
        </span>
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
        <a href={titleHref} className="min-w-0 cursor-pointer text-sm text-foreground">
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
      <div className="flex min-h-11 items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:gap-8 lg:px-8">
        {brand}

        <nav className="flex shrink-0 items-center gap-1" aria-label={navLabel}>
          {children}
          {githubHref ? (
            <a
              href={githubHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open the GitHub repository"
              className={buttonVariants({
                className:
                  "hidden gap-1 bg-action text-action-foreground hover:bg-action/80 lg:inline-flex",
                size: "default",
              })}
            >
              <GitHubIcon />
              <ArrowUpRight aria-hidden="true" />
            </a>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

interface PackageSwitcherProps {
  ariaLabel: string;
  packages: WebPackage[];
  subtitle?: ReactNode;
  title: string;
  titleSmol: string;
}

/**
 * Brand typography shared verbatim by the switcher trigger and its menu items
 * so both always render at the same size, kerning, and weight.
 */
function PackageBrand({ subtitle, title }: { subtitle?: ReactNode; title: string }) {
  return (
    <span className="flex min-w-0 items-baseline gap-3 truncate font-sans">
      <span className="shrink-0 whitespace-nowrap text-sm font-bold tracking-tight text-primary">
        /{title}
        <span className="pl-0.5 text-xs font-bold tracking-tight">by JFA</span>
      </span>
      {subtitle ? (
        <span className="shrink-0 text-[11px] font-normal tracking-normal text-muted-foreground/75">
          /
        </span>
      ) : null}
      {subtitle ? (
        <span className="truncate text-[11px] font-normal tracking-normal text-muted-foreground">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}

/** Brand switcher rendered in place of the plain title when packages are provided. */
function PackageSwitcher({
  ariaLabel,
  packages,
  subtitle,
  title,
  titleSmol,
}: PackageSwitcherProps) {
  return (
    <DropdownMenuTrigger>
      <Button
        aria-label={ariaLabel}
        variant="ghost"
        className="-ml-1 h-auto min-w-0 justify-start gap-1 px-1 py-0.5 text-sm font-bold tracking-tight whitespace-nowrap text-primary hover:text-primary dark:hover:text-primary [&_svg:not([class*='size-'])]:size-3"
      >
        <span className="flex min-w-0 truncate lg:pr-2">
          <span className="hidden min-w-0 sm:inline">
            <PackageBrand subtitle={subtitle} title={title} />
          </span>
          <span className="inline min-w-0 sm:hidden">
            <PackageBrand title={titleSmol} />
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="shrink-0 opacity-70" />
      </Button>
      <DropdownMenu className="w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] sm:w-auto sm:min-w-72 sm:max-w-none">
        {packages.map((pkg) => {
          const routeSubtitle =
            pkg.routes.find((route) => route.path === "/")?.title ?? pkg.routes[0]?.title;
          return (
            <DropdownMenuItem
              key={pkg.path}
              href={pkg.path === "/" ? "/" : `${pkg.path}/`}
              textValue={`${pkg.title} ${routeSubtitle ?? ""}`}
            >
              <PackageBrand subtitle={routeSubtitle} title={pkg.title} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.08.55-.17.55-.39 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .22.15.48.55.4A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
