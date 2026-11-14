import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@jfa.dev/common/ui";

import {
  accordionPlaylists,
  defaultPlaylist,
  playlistAnchorId,
  type PlaylistDefinition,
} from "@/data/playlists";
import { useNowPlaying } from "@/features/music/hooks/use-now-playing";

import { PlaylistTable } from "./playlist-table";

function PlaylistMeta({
  playlist,
  headingLevel,
}: {
  playlist: PlaylistDefinition;
  /**
   * `h1` for the default playlist. Accordion rows already sit inside a React Aria
   * `Heading` (`AccordionHeader`), so they keep the title as an inline link.
   */
  headingLevel: "h1" | "span";
}) {
  const Heading = headingLevel;
  const { snapshot } = playlist;
  const Root = headingLevel === "h1" ? "div" : "span";
  const Meta = headingLevel === "h1" ? "p" : "span";

  return (
    <Root className="min-w-0 flex-1 text-left">
      <Heading
        id={`${playlistAnchorId(playlist.id)}-heading`}
        className={`block ${headingLevel === "h1" ? "type-page-title" : "type-section-title"}`}
      >
        <a
          href={snapshot.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground"
        >
          {snapshot.title}
        </a>
      </Heading>
      <Meta
        className={`${headingLevel === "h1" ? "mt-3" : "mt-1.5"} flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-normal text-muted-foreground`}
      >
        <span>{snapshot.trackCount} tracks</span>
        <span>Updated {new Date(snapshot.fetchedAt).toLocaleDateString()}</span>
      </Meta>
    </Root>
  );
}

function DefaultPlaylistSection({ playlist }: { playlist: PlaylistDefinition }) {
  const { data: nowPlaying } = useNowPlaying();
  const activeTrack = nowPlaying?.status === "playing" ? nowPlaying.track : null;

  return (
    <section
      id={playlistAnchorId(playlist.id)}
      aria-labelledby={`${playlistAnchorId(playlist.id)}-heading`}
      className="min-h-0"
    >
      <header className="shrink-0 border-b border-border bg-background page-gutters py-6">
        <PlaylistMeta playlist={playlist} headingLevel="h1" />
      </header>
      <div className="min-h-0">
        <PlaylistTable
          key={playlist.id}
          tracks={playlist.snapshot.tracks}
          activeTrack={activeTrack}
        />
      </div>
    </section>
  );
}

function AccordionPlaylistItem({ playlist }: { playlist: PlaylistDefinition }) {
  const { data: nowPlaying } = useNowPlaying();
  const activeTrack = nowPlaying?.status === "playing" ? nowPlaying.track : null;

  return (
    <AccordionItem id={playlist.id} className="border-border">
      <div id={playlistAnchorId(playlist.id)} className="scroll-mt-24">
        <AccordionHeader className="items-start gap-3 page-gutters py-5">
          {/*
            Title link is a sibling of the expand button, not nested inside it,
            so the Apple Music URL stays a real hyperlink while the chevron toggles.
          */}
          <PlaylistMeta playlist={playlist} headingLevel="span" />
          <AccordionTrigger
            aria-label={`Toggle ${playlist.snapshot.title}`}
            className="mt-1 size-9 flex-none shrink-0 items-center justify-center self-start rounded-md p-0 hover:bg-muted hover:no-underline **:data-[slot=accordion-trigger-icon]:ml-0"
          />
        </AccordionHeader>
        <AccordionContent className="pb-0">
          <PlaylistTable
            key={playlist.id}
            tracks={playlist.snapshot.tracks}
            activeTrack={activeTrack}
            lazy
          />
        </AccordionContent>
      </div>
    </AccordionItem>
  );
}

/** Default playlist plus closed accordion for every other build-time list. */
export function PlaylistCatalog() {
  return (
    <>
      <DefaultPlaylistSection playlist={defaultPlaylist} />
      {accordionPlaylists.length > 0 ? (
        <section aria-label="More playlists" className="border-t border-border">
          <Accordion className="w-full">
            {accordionPlaylists.map((playlist) => (
              <AccordionPlaylistItem key={playlist.id} playlist={playlist} />
            ))}
          </Accordion>
        </section>
      ) : null}
    </>
  );
}
