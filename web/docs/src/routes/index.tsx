import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The docs root has no landing page of its own — every docs URL belongs to a
 * package section, so the sidebar can always show the package dropdown.
 * Match cloudops-tools and send `/docs` straight to the first package.
 */
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/$", params: { _splat: "keweke" } });
  },
});
