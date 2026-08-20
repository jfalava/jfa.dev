import { SiteHeader } from "@jfa.dev/common/ui";

import { ThemeToggle } from "@/components/theme-toggle";
import { appPath } from "@/lib/site-paths";

export function OgImageGenHeader() {
  return (
    <SiteHeader
      title="OpenGraph Image Generator"
      subtitle="Create OpenGraph images from scratch"
      titleHref={appPath("/")}
      navLabel="Editor navigation"
      githubHref="https://github.com/jfalava/jfa.dev"
    >
      <ThemeToggle />
    </SiteHeader>
  );
}
