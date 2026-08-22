import { cn } from "../../lib/utils";
import type { WebPackage } from "../../web-packages";

import { Button, buttonVariants } from "./button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { Kbd, KbdGroup } from "./kbd";

import { ArrowUpRight, ChevronDown, CodeXml } from "lucide-react";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";

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
              aria-label="View source on GitHub"
              className={buttonVariants({
                className:
                  "gap-1.5 bg-action text-action-foreground hover:bg-action/80 sm:w-auto sm:gap-1.5 sm:px-2.5",
                size: "icon-lg",
              })}
            >
              <CodeXml aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Source</span>
              <ArrowUpRight aria-hidden="true" className="hidden size-4 lg:inline" />
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
  const [isOpen, setIsOpen] = useState(false);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

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
        className="-ml-1 h-auto w-48 min-w-0 shrink justify-start gap-1 px-1 py-0.5 text-sm font-bold tracking-tight whitespace-nowrap text-primary hover:text-primary sm:w-[21rem] md:w-[30rem] lg:w-[36rem] dark:hover:text-primary [&_svg:not([class*='size-'])]:size-3"
      >
        <span className="flex min-w-0 flex-1 truncate lg:pr-2">
          <span className="hidden min-w-0 sm:inline">
            <PackageBrand subtitle={subtitle} title={title} />
          </span>
          <span className="inline min-w-0 sm:hidden">
            <PackageBrand title={titleSmol} />
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="shrink-0 opacity-70" />
      </Button>
      <DropdownMenu className="w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] sm:w-(--trigger-width) sm:min-w-0 sm:max-w-none">
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
        <DropdownMenuSeparator />
        <div className="flex items-center justify-end gap-1 px-1.5 py-1 text-xs text-muted-foreground">
          <span>Switch packages</span>
          <KbdGroup>
            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>⇧</Kbd>
            <Kbd>U</Kbd>
          </KbdGroup>
        </div>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
