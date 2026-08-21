import { SiteHeader } from "@jfa.dev/common/ui";
import { webPackages } from "@jfa.dev/common/web-packages";

import { ThemeToggle } from "@/components/theme-toggle";
import { appPath } from "@/lib/site-paths";

export function OgImageGenHeader() {
  return (
    <SiteHeader
      title="OpenGraph Image Generator"
      subtitle="Create OpenGraph images from scratch"
      titleHref={appPath("/")}
      packages={webPackages}
      activePackagePath="/og-img-gen"
      navLabel="Editor navigation"
      githubHref="https://github.com/jfalava/jfa.dev/tree/main/web/og-img-gen"
    >
      <ThemeToggle />
    </SiteHeader>
  );
}
