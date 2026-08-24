import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/plugins/lucide-icons";
import { defineDocs } from "fumadocs-mdx/macro";

export const docs = defineDocs({
  dir: "content/docs",
});

export const source = loader({
  // Mount-relative (the router lives under the /docs base path), so page-tree
  // URLs line up with TanStack Router links and location pathnames.
  baseUrl: "/",
  plugins: [lucideIconsPlugin()],
  source: docs.toFumadocsSource(),
});
