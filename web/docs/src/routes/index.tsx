import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { gifs } from "virtual:landing-gifs";

import { DocsLandingView, loadLanding } from "@/components/docs-page";

/**
 * Landing page for the docs root. It shares the docs shell so the sidebar
 * lists both package sections; navigating into any page hands the sidebar
 * over to that package's own tree, as on every other docs route.
 */
export const Route = createFileRoute("/")({
  loader: () => loadLanding(),
  component: RouteComponent,
});

function RouteComponent() {
  // Build-time list from `public/gifs/{1,2,...}.gif` via the `landingGifs`
  // Vite plugin. Adding `3.gif` (etc.) is picked up on next build/dev restart.
  // SSR renders a deterministic fallback (first gif) so hydration matches;
  // the client then picks a random one after mount.
  const base = import.meta.env.BASE_URL;
  const fallback = gifs[0] ? `${base}${gifs[0]}` : `${base}court-jester-dancing.gif`;
  const [src, setSrc] = useState(fallback);

  // Randomize client-side after hydration so SSR stays deterministic.
  // `setState` in an effect is intentional here — the value is non-deterministic
  // and must not run during SSR/hydration.
  // oxlint-disable-next-line react/set-state-in-effect, react/exhaustive-effect-dependencies -- client-only randomization after mount
  useEffect(() => {
    if (gifs.length <= 1) {
      return;
    }
    const next = gifs[Math.floor(Math.random() * gifs.length)];
    setSrc(`${base}${next}`);
    // `base` is static for the build (Vite `base`); `gifs` is build-time constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only effect
  }, []);

  return (
    <DocsLandingView data={Route.useLoaderData()}>
      <main className="flex flex-col items-center justify-center gap-8 px-6 py-16 text-center [grid-area:main]">
        <img
          src={src}
          alt="A court jester dancing"
          width={350}
          height={320}
          className="w-56 sm:w-64"
        />
        <div className="space-y-2">
          <h1 className="font-sans text-4xl leading-[0.95] font-semibold tracking-tighter sm:text-6xl">
            The Knowledge Base: DOCS by JFA
          </h1>
          <p className="text-muted-foreground text-sm">why do u need this lmao</p>
        </div>
      </main>
    </DocsLandingView>
  );
}
