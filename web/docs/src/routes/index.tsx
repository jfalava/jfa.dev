import { createFileRoute } from "@tanstack/react-router";

import { DocsRouteView, loadDocs } from "@/components/docs-page";

export const Route = createFileRoute("/")({
  component: RouteComponent,
  loader: () => loadDocs([]),
});

function RouteComponent() {
  return <DocsRouteView data={Route.useLoaderData()} />;
}
