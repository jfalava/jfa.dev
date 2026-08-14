import type { ListSummary } from "@jfa.dev/common/lists";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { KewekeHeader } from "@/components/keweke-header";
import { listLocalLists, subscribeToLocalLists } from "@/lib/local-list-store";

export const Route = createFileRoute("/")({ component: EmptyState });

function EmptyState() {
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshLists = useCallback(() => {
    void listLocalLists().then((nextLists) => {
      setLists(nextLists);
      setIsLoading(false);
      return nextLists;
    });
  }, []);

  useEffect(() => {
    refreshLists();
    return subscribeToLocalLists(refreshLists);
  }, [refreshLists]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <KewekeHeader />
      <main className="min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <section className="invoice-paper invoice-rule border border-t-4 border-t-primary">
          <div className="px-4 py-10 sm:px-8 sm:py-16">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                  local collection
                </p>
                <h1 className="mt-2 text-4xl leading-[0.95] font-semibold tracking-[-0.05em] uppercase sm:text-6xl">
                  Your lists
                </h1>
              </div>
              <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                {lists.length} saved
              </p>
            </div>

            {isLoading ? (
              <p className="py-10 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                reading local storage…
              </p>
            ) : lists.length > 0 ? (
              <div className="divide-y divide-border">
                {lists.map((list) => (
                  <Link
                    key={list.id}
                    params={{ listId: list.alias ?? list.id }}
                    to="/$listId"
                    className="group flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold tracking-tight group-hover:text-primary">
                        {list.title}
                      </p>
                      <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                        {list.backend} · {list.itemCount} lines · {list.completedCount} done
                        {list.alias ? ` · ${list.alias}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                      open →
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-10 text-sm text-muted-foreground">
                No local lists yet. Use “new” in the header to start one.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
