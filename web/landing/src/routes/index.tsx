import { SiteHeader } from "@jfa.dev/common/ui";
import { webPackages } from "@jfa.dev/common/web-packages";
import { createFileRoute } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/theme-toggle";
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
        packages={webPackages}
        activePackagePath="/"
        navLabel="Ego page"
        githubHref="https://github.com/jfalava/jfa.dev/tree/main/web/landing"
      >
        <ThemeToggle />
      </SiteHeader>
      <main className="relative flex-1 overflow-hidden overscroll-none bg-[#0e1116]">
        <Grainient
          className="pointer-events-none absolute inset-0 size-full"
          color1="#f2f6ff"
          color2="#8ca4ff"
          color3="#1c2642"
          grainAmount={0.1}
          saturation={1}
        />
        <div className="relative z-10 flex h-full items-center justify-center px-6 py-12">
          <div className="h-36 w-full max-w-5xl sm:h-44">
            <TextPressure
              text="jorge fernando álava"
              textColor="#000000"
              stroke={false}
              flex={false}
              scale={false}
              width={false}
              weight
              italic={false}
              useWebkitFallback
              webkitFallbackClassName="font-sans text-black text-5xl md:text-7xl drop-shadow-none text-shadow-none"
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
