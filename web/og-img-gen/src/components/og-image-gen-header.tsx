import { SiteHeader } from "@jfa.dev/common/ui";

import { ThemeToggle } from "@/components/theme-toggle";
import { appPath } from "@/lib/site-paths";

export function OgImageGenHeader() {
  return (
    <SiteHeader
      title="OG IMAGE GEN"
      subtitle="Create OpenGraph images from scratch"
      titleHref={appPath("/")}
      navLabel="Editor navigation"
      githubHref="https://github.com/jfalava/jfa.dev"
    >
      <span className="hidden rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground sm:inline-flex">
        1200 × 630
      </span>
      <ThemeToggle />
    </SiteHeader>
  );
}
