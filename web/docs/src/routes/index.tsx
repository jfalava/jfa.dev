import { packageTagline } from "@jfa.dev/common/web-packages";
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

/** Apps with a docs section, in sidebar order. */
const sections = [
  { slug: "keweke", title: "KEWEKE", path: "/keweke" },
  { slug: "opengraph", title: "OpenGraph", path: "/opengraph" },
] as const;

function RouteComponent() {
  const base = import.meta.env.BASE_URL;

  return (
    <DocsLandingView data={Route.useLoaderData()}>
      <main className="flex flex-col gap-10 px-6 py-16 [grid-area:main] sm:px-10">
        <div className="max-w-2xl space-y-3">
          <h1 className="font-sans text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl">
            DOCS
          </h1>
          <p className="text-base text-muted-foreground">
            {packageTagline("/docs")}: what each screen does, how lists sync, and every keyboard
            shortcut. Pick an app to start.
          </p>
        </div>
        <ul className="grid max-w-2xl gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.slug} className="bg-background">
              <a
                href={`${base}${section.slug}`}
                className="flex h-full flex-col gap-1 p-5 no-underline transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              >
                <span className="text-sm font-bold tracking-tight text-primary">
                  /{section.title}
                </span>
                <span className="text-sm text-muted-foreground">
                  {packageTagline(section.path)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </DocsLandingView>
  );
}
