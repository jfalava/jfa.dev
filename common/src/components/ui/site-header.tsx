import { cn } from "../../lib/utils";
import type { WebPackage } from "../../web-packages";

import { Button, buttonVariants } from "./button";
import { DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { Kbd, KbdGroup } from "./kbd";

import { ArrowUpRight, ChevronDown, CodeXml } from "lucide-react";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Menu as MenuPrimitive, Popover as PopoverPrimitive } from "react-aria-components";

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
        className="-ml-1 h-auto w-48 min-w-0 shrink justify-start gap-1 px-1 py-0.5 text-sm font-bold tracking-tight whitespace-nowrap text-primary hover:text-primary sm:w-84 md:w-120 lg:w-xl dark:hover:text-primary [&_svg:not([class*='size-'])]:size-3"
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
        <KbdGroup className="hidden shrink-0 gap-1 sm:inline-flex">
          <Kbd className="h-4 min-w-4 px-0.5 text-[10px] leading-none">{isMac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd className="h-4 min-w-4 px-0.5 text-[10px] leading-none">⇧</Kbd>
          <Kbd className="h-4 min-w-4 px-0.5 text-[10px] leading-none">U</Kbd>
        </KbdGroup>
      </Button>
      <PopoverPrimitive
        placement="bottom start"
        offset={4}
        crossOffset={0}
        className={cn(
          "z-50 w-(--trigger-width) min-w-32 origin-(--trigger-anchor-point) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:overflow-hidden data-exiting:fade-out-0 data-exiting:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2",
          "w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] sm:w-(--trigger-width) sm:min-w-0 sm:max-w-none",
        )}
      >
        <MenuPrimitive className="max-h-[inherit] overflow-x-hidden overflow-y-auto outline-hidden">
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
        </MenuPrimitive>
      </PopoverPrimitive>
    </DropdownMenuTrigger>
  );
}
