import { createFileRoute } from "@tanstack/react-router";

import { PlaylistHeader, TwentyTracksTable } from "@/features/music/components/twenty-tracks";

export const Route = createFileRoute("/")({ component: PlaylistPage });

function PlaylistPage() {
  return (
    <>
      <PlaylistHeader />
      <main id="playlist" className="catalog-main min-h-0 flex-1 overflow-hidden">
        <TwentyTracksTable />
      </main>
    </>
  );
}
