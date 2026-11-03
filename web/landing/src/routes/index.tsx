import { SiteHeader, ThemeToggle } from "@jfa.dev/common/ui";
import { webPackages } from "@jfa.dev/common/web-packages";
import { createFileRoute } from "@tanstack/react-router";

import Grainient from "@/features/hero/components/grainient";
import TextPressure from "@/features/hero/components/text-pressure";
import { RepoLinks } from "@/features/links/components/repo-links";
import { getRepositoryLinks } from "@/features/links/links";

export const Route = createFileRoute("/")({
  loader: () => getRepositoryLinks(),
  component: App,
});

function App() {
  const repositories = Route.useLoaderData();

  return (
    <div className="flex h-dvh min-h-svh flex-col">
      <SiteHeader
        title="Landing"
        subtitle=""
        packages={webPackages}
        activePackagePath="/"
        navLabel="Ego page"
        githubHref="https://github.com/jfalava/jfa.dev/tree/main/web/landing"
      >
        <ThemeToggle />
      </SiteHeader>
      <main className="relative flex-1 overflow-hidden overscroll-none bg-[#0e1116]">
        {/* Every stop is dark enough for white display type (≥4.5:1 on the lightest). */}
        <Grainient
          className="pointer-events-none absolute inset-0 size-full"
          color1="#6d5cff"
          color2="#2b2f8f"
          color3="#0e1116"
          grainAmount={0.1}
          saturation={1}
        />
        <div className="relative z-10 flex h-full items-center justify-center px-6 py-12">
          <h1 className="sr-only">Jorge Fernando Álava</h1>
          <div className="h-36 w-full max-w-5xl sm:h-44" aria-hidden="true">
            <TextPressure
              text="jorge fernando álava"
              textColor="#ffffff"
              stroke={false}
              flex={false}
              scale={false}
              width={false}
              weight
              italic={false}
              useWebkitFallback
              webkitFallbackClassName="font-sans text-white text-5xl md:text-7xl drop-shadow-none text-shadow-none"
              minFontSize={30}
              className="cursor-default font-sans leading-[0.95] font-medium tracking-tight drop-shadow-none select-none text-shadow-none"
            />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-5 sm:px-6 sm:pb-8">
          <RepoLinks repositories={repositories} />
        </div>
      </main>
    </div>
  );
}
