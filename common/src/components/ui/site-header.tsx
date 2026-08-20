import { cn } from "../../lib/utils";

import { buttonVariants } from "./button";

import { ArrowUpRight } from "lucide-react";
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
  /** The accessible name for the header navigation. */
  navLabel: string;
  /** The repository URL for the normalized GitHub action. */
  githubHref?: string;
  /** App-specific actions rendered before the shared GitHub action. */
  children?: ReactNode;
}

/** Shared shell for the headers used by the web applications. */
export function SiteHeader({
  children,
  className,
  githubHref,
  navLabel,
  subtitle,
  title,
  titleHref,
  titleSmol = title,
  ...props
}: SiteHeaderProps) {
  const brand = (
    <div
      aria-label={`${title} by JFA`}
      className="flex min-w-0 items-baseline gap-3 truncate lg:pr-4"
    >
      <span className="shrink-0 text-sm font-bold tracking-wide text-primary">
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
    </div>
  );

  return (
    <header
      className={cn(
        "site-header sticky top-0 z-30 shrink-0 border-b border-border bg-background",
        className,
      )}
      {...props}
    >
      <div className="flex min-h-11 items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:gap-8 lg:px-8">
        {titleHref ? (
          <a href={titleHref} className="min-w-0 cursor-pointer text-sm text-foreground">
            {brand}
          </a>
        ) : (
          brand
        )}

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

function GitHubIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.08.55-.17.55-.39 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .22.15.48.55.4A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
