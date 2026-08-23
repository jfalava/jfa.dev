import { createFileRoute } from "@tanstack/react-router";

import { DocsRouteView, loadDocs } from "@/components/docs-page";

export const Route = createFileRoute("/$")({
  component: RouteComponent,
  loader: async ({ params }) => {
    // TanStack Router exposes catch-all params as `_splat`
    const slugs = params._splat?.split("/") ?? [];
    return loadDocs(slugs);
  },
});

function RouteComponent() {
  return <DocsRouteView data={Route.useLoaderData()} />;
}
