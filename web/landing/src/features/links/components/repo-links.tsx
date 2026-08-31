import { buttonVariants } from "@jfa.dev/common/ui";

import { appPath } from "@/lib/site-paths";
import { cn } from "@/lib/utils";

import type { RepositoryLink } from "../links";

interface RepoLinksProps {
  repositories: RepositoryLink[];
}

/** A compact, responsive shelf of the projects being actively pushed. */
export function RepoLinks({ repositories }: RepoLinksProps) {
  return (
    <section className="w-full max-w-5xl" aria-label="Current projects">
      <div className="flex min-w-0 items-center gap-3 rounded-lg border border-white/15 bg-[#0e1116]/60 p-2 shadow-2xl shadow-[#0e1116]/20 backdrop-blur-md sm:gap-4 sm:px-3">
        <div className="flex shrink-0 items-center gap-2 px-1 text-[10px] font-medium tracking-[0.14em] text-white/65 uppercase">
          <span>building now</span>
        </div>
        <span className="h-4 w-px shrink-0 bg-white/15" aria-hidden="true" />
        <ul
          className="flex min-w-0 touch-pan-x scrollbar-none gap-2 overflow-x-auto py-0.5 [&::-webkit-scrollbar]:hidden"
          style={{ listStyle: "none", margin: 0, paddingLeft: 0 }}
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
