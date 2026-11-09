import { buttonVariants } from "@jfa.dev/common/ui";
import { useEffect, useRef, useState } from "react";

import { appPath } from "@/lib/site-paths";
import { cn } from "@/lib/utils";

import type { RepositoryLink } from "../links";

interface RepoLinksProps {
  repositories: readonly RepositoryLink[];
}

/** A compact, responsive shelf of the projects being actively pushed. */
export function RepoLinks({ repositories }: RepoLinksProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  // Fade whichever edge still hides repositories, so the row reads as scrollable.
  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return undefined;
    }
    const update = () => {
      const maxScroll = list.scrollWidth - list.clientWidth;
      setEdges({ start: list.scrollLeft > 1, end: list.scrollLeft < maxScroll - 1 });
    };
    update();
    list.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const fadeStart = edges.start ? "transparent" : "black";
  const fadeEnd = edges.end ? "transparent" : "black";
  const mask = `linear-gradient(to right, ${fadeStart}, black 2rem, black calc(100% - 2rem), ${fadeEnd})`;

  return (
    <section className="w-full max-w-5xl" aria-label="Working on">
      <div className="flex min-w-0 items-center gap-3 rounded-lg border border-white/15 bg-[#0e1116]/60 p-2 shadow-2xl shadow-[#0e1116]/20 backdrop-blur-md sm:gap-4 sm:px-3">
        <h2 className="shrink-0 px-1 text-sm text-white/65">Working on</h2>
        <span className="h-4 w-px shrink-0 bg-white/15" aria-hidden="true" />
        <ul
          ref={listRef}
          className="flex min-w-0 touch-pan-x scrollbar-none gap-2 overflow-x-auto py-0.5 [&::-webkit-scrollbar]:hidden"
          style={{
            listStyle: "none",
            margin: 0,
            paddingLeft: 0,
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
          aria-label="Repositories"
        >
          {repositories.map((repository) => (
            <li key={repository.url} className="shrink-0">
              <a
                href={repository.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${repository.name} on GitHub`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-white/15 bg-white/[0.07] text-white/85 hover:border-white/30 hover:bg-white/16 hover:text-white",
                )}
              >
                <img src={appPath("/github.svg")} alt="" className="size-3 opacity-70 invert" />
                <span>{repository.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
