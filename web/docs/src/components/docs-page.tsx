import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type * as PageTree from "fumadocs-core/page-tree";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { Sidebar, SidebarTrigger, useSidebar } from "fumadocs-ui/layouts/docs/slots/sidebar";
import { getLayoutTabs, type LayoutTab } from "fumadocs-ui/layouts/shared";
import type { ReactNode } from "react";

import { useMDXComponents } from "@/components/mdx";
import { docs, source } from "@/lib/source";

const docsServerLoader = createServerFn({
  method: "GET",
})
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) {
      throw notFound();
    }

    return {
      path: page.path,
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  });

export type DocsLoaderData = Awaited<ReturnType<typeof docsServerLoader>>;

const landingServerLoader = createServerFn({
  method: "GET",
}).handler(async () => {
  return {
    pageTree: await source.serializePageTree(source.getPageTree()),
  };
});

export type LandingLoaderData = Awaited<ReturnType<typeof landingServerLoader>>;

/**
 * The sidebar context provider is hoisted to the root shell so the shared
 * site header (rendered above this layout) can toggle the sidebar. The slot
 * must be a passthrough to avoid shadowing the hoisted provider.
 */
function sidebarProviderSlot({ children }: { children?: ReactNode }) {
  return children;
}

/** Shell header height; keeps sticky docs rows below it and the page at 100dvh. */
const shellHeaderHeight = "var(--fd-banner-height, 0px)";

/** Shared DocsLayout wiring used by the landing page and every doc page. */
function DocsShell({
  tree,
  tabs,
  children,
}: {
  tree: PageTree.Root;
  tabs: LayoutTab[];
  children: ReactNode;
}) {
  return (
    <DocsLayout
      nav={{ enabled: false }}
      tree={tree}
      tabs={tabs}
      tabMode="auto"
      // The shell header owns search and the sidebar toggle; keep both out of
      // the sidebar itself. The fumadocs footer (theme toggle) is removed
      // entirely in favor of the common ThemeToggle in the docs header.
      searchToggle={{ enabled: false }}
      themeSwitch={{ enabled: false }}
      sidebar={{ collapsible: false }}
      slots={{
        sidebar: {
          provider: sidebarProviderSlot,
          root: Sidebar,
          trigger: SidebarTrigger,
          // oxlint-disable-next-line react/hooks -- the slot contract passes the hook as a value
          useSidebar,
        },
      }}
      containerProps={{
        style: { minHeight: `calc(100dvh - ${shellHeaderHeight})` },
      }}
    >
      {children}
    </DocsLayout>
  );
}

export async function loadDocs(slugs: string[]): Promise<DocsLoaderData> {
  const data = await docsServerLoader({ data: slugs });
  await docs.getPage(data.path)?.preload();
  return data;
}

export async function loadLanding(): Promise<LandingLoaderData> {
  return landingServerLoader();
}

function Content({ path }: { path: string }) {
  const page = docs.getPage(path);
  if (!page) {
    throw new Error(`unknown page: ${path}`);
  }

  return (
    <DocsPage toc={page.toc}>
      <DocsTitle className="font-sans text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl">
        {page.title}
      </DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      <DocsBody>
        <page.body components={useMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function DocsRouteView({ data }: { data: DocsLoaderData }) {
  const resolved = useFumadocsLoader(data);

  return (
    <DocsShell tree={resolved.pageTree} tabs={getLayoutTabs(resolved.pageTree)}>
      <Content path={resolved.path} />
    </DocsShell>
  );
}

/**
 * Landing layout: same shell as doc pages, but without tabs so the package
 * dropdown never renders. The pathname matches no root folder, so fumadocs'
 * tree context falls back to the full tree and the sidebar lists every
 * package section at once.
 */
export function DocsLandingView({
  data,
  children,
}: {
  data: LandingLoaderData;
  children: ReactNode;
}) {
  const resolved = useFumadocsLoader(data);
  const { children: nodes } = resolved.pageTree;

  // Root folders render collapsed by default; open them so the landing
  // sidebar presents both packages' pages without extra clicks.
  const tree = {
    ...resolved.pageTree,
    children: nodes.map((node) =>
      node.type === "folder" && node.root ? { ...node, defaultOpen: true } : node,
    ),
  };

  return (
    <DocsShell tree={tree} tabs={[]}>
      {children}
    </DocsShell>
  );
}
