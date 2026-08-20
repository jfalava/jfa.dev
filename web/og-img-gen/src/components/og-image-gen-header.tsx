import { buttonVariants } from "@jfa.dev/common/ui";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, FileImage } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

export function OgImageGenHeader() {
  return (
    <header className="catalog-header sticky top-0 z-30 shrink-0 border-b border-border bg-background">
      <div className="flex min-h-11 items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:gap-8 lg:px-8">
        <Link to="/" className="min-w-0 cursor-pointer text-sm text-foreground">
          <div
            aria-label="OG Image Generator by JFA"
            className="flex min-w-0 items-center gap-3 truncate lg:pr-4"
          >
            <span className="shrink-0 text-sm font-bold tracking-wide text-primary">
              <span className="inline">/OG IMAGE GEN</span>
              <span className="hidden pl-0.5 text-xs tracking-tight sm:inline">by JFA</span>
            </span>
            <span className="hidden text-[11px] text-muted-foreground/75 sm:inline">/</span>
            <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
              Create OpenGraph images from scratch
            </span>
          </div>
        </Link>

        <nav className="flex shrink-0 items-center gap-1" aria-label="Editor navigation">
          <span className="hidden rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground sm:inline-flex">
            1200 × 630
          </span>
          <ThemeToggle />
          <a
            href="https://github.com/jfalava/jfa.dev"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              className:
                "hidden gap-1 bg-action text-action-foreground hover:bg-action/80 lg:inline-flex",
              size: "default",
            })}
          >
            <span>GitHub</span>
            <ArrowUpRight />
          </a>
        </nav>
      </div>
    </header>
  );
}
