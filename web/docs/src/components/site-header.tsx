import { Button, Kbd, KbdGroup, SiteHeader, ThemeToggle } from "@jfa.dev/common/ui";
import { webPackages } from "@jfa.dev/common/web-packages";
import { useSidebar } from "fumadocs-ui/components/sidebar/base";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { PanelLeft, Search } from "lucide-react";
import { useCallback, useEffect } from "react";

const isMac = /Mac|iPhone|iPad/.test(globalThis.navigator?.userAgent ?? "");

export function DocsSiteHeader() {
  const { setOpenSearch } = useSearchContext();
  const { open, setOpen, collapsed, setCollapsed, mode } = useSidebar();

  const toggleSidebar = useCallback(() => {
    if (mode === "drawer") {
      setOpen(!open);
    } else {
      setCollapsed(!collapsed);
    }
  }, [collapsed, mode, open, setCollapsed, setOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.code === "KeyB"
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  return (
    <SiteHeader
      title="DOCS"
      subtitle="The Knowledge Base"
      titleHref="/"
      packages={webPackages}
      activePackagePath="/docs"
      navLabel="Docs navigation"
      githubHref="https://github.com/jfalava/jfa.dev/tree/main/web/docs"
    >
      <Button
        aria-label="Open search"
        variant="ghost"
        size="lg"
        className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
        onPress={() => setOpenSearch(true)}
      >
        <Search aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Search</span>
        <KbdGroup className="hidden shrink-0 gap-1 sm:inline-flex">
          <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">
            {isMac ? "⌘" : "Ctrl"}
          </Kbd>
          <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">K</Kbd>
        </KbdGroup>
      </Button>
      <Button
        aria-label={mode === "drawer" ? "Toggle sidebar menu" : "Toggle sidebar"}
        aria-expanded={mode === "drawer" ? open : !collapsed}
        variant="ghost"
        size="lg"
        className="gap-1.5 px-2 text-muted-foreground hover:text-foreground aria-expanded:bg-transparent aria-expanded:text-muted-foreground"
        onPress={toggleSidebar}
      >
        <PanelLeft aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Toggle</span>
        <KbdGroup className="hidden shrink-0 gap-1 sm:inline-flex">
          <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">
            {isMac ? "⌘" : "Ctrl"}
          </Kbd>
          <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">B</Kbd>
        </KbdGroup>
      </Button>
      <ThemeToggle />
    </SiteHeader>
  );
}
