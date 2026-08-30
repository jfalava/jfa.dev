import { createFileRoute } from "@tanstack/react-router";

import { PlaylistCatalog } from "@/features/music/components/playlist-catalog";

export const Route = createFileRoute("/")({ component: PlaylistPage });

function PlaylistPage() {
  return (
    <main id="playlist" className="catalog-main min-h-0 flex-1 overflow-y-auto">
      <PlaylistCatalog />
    </main>
  );
}
