import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <DocsLandingView data={Route.useLoaderData()}>
      <main className="flex flex-col items-center justify-center gap-8 px-6 py-16 text-center [grid-area:main]">
        <img
          src={`${import.meta.env.BASE_URL}court-jester-dancing.gif`}
          alt="A court jester dancing"
          width={350}
          height={320}
          className="w-56 rounded-2xl border shadow-lg sm:w-64"
        />
        <div className="space-y-2">
          <h1 className="font-sans text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl">
            DOCS
          </h1>
          <p className="text-muted-foreground">The Knowledge Base.</p>
        </div>
      </main>
    </DocsLandingView>
  );
}
