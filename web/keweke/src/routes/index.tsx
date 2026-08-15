import type { ListSummary } from "@jfa.dev/common/lists";
import { Button } from "@jfa.dev/common/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { KewekeHeader } from "@/components/keweke-header";
import { ensureLocalIdentity } from "@/lib/local-identity";
import {
  createLocalList,
  deleteLocalList,
  listLocalLists,
  subscribeToLocalLists,
} from "@/lib/local-list-store";
import { syncRemoteLists } from "@/lib/remote-list-sync";

const REMOTE_LIST_SYNC_INTERVAL_MS = 60_000;

export const Route = createFileRoute("/")({ component: EmptyState });

function EmptyState() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmingListId, setConfirmingListId] = useState<string>();
  const [deletingListId, setDeletingListId] = useState<string>();
  const [error, setError] = useState<string>();

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

  useEffect(() => {
    let cancelled = false;
    let isSyncing = false;

    const syncLists = async (): Promise<void> => {
      if (isSyncing) {
        return;
      }
      isSyncing = true;
      try {
        const identity = await ensureLocalIdentity();
        if (identity?.remoteUsername) {
          await syncRemoteLists(identity);
        }
      } catch {
        // The local catalog remains usable while remote synchronization retries.
      } finally {
        isSyncing = false;
        if (!cancelled) {
          refreshLists();
        }
      }
    };

    void syncLists();
    const interval = window.setInterval(() => void syncLists(), REMOTE_LIST_SYNC_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshLists]);

  const removeList = useCallback(async (list: ListSummary): Promise<void> => {
    if (list.backend !== "local") {
      return;
    }

    setDeletingListId(list.id);
    try {
      await deleteLocalList(list.id);
      setConfirmingListId(undefined);
      setError(undefined);
    } catch {
      setError("Could not delete that local list.");
    } finally {
      setDeletingListId(undefined);
    }
  }, []);

  const createList = async (): Promise<void> => {
    setIsCreating(true);
    try {
      const result = await createLocalList();
      await navigate({ to: "/$listId", params: { listId: result.id } });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <KewekeHeader hideMobileNewListButton={!isLoading && lists.length === 0} />
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8">
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
                  <div className="flex items-center justify-between gap-4 py-4" key={list.id}>
                    <Link
                      params={{ listId: list.alias ?? list.id }}
                      to="/$listId"
                      className="group min-w-0 flex-1"
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
                    </Link>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {list.backend === "local" ? (
                        confirmingListId === list.id ? (
                          <>
                            <span className="font-mono text-[10px] tracking-[0.08em] text-destructive uppercase">
                              delete?
                            </span>
                            <Button
                              aria-label={`Confirm delete ${list.title}`}
                              isDisabled={deletingListId === list.id}
                              onPress={() => void removeList(list)}
                              size="sm"
                              variant="destructive"
                            >
                              yes
                            </Button>
                            <Button
                              aria-label={`Keep ${list.title}`}
                              isDisabled={deletingListId === list.id}
                              onPress={() => setConfirmingListId(undefined)}
                              size="sm"
                              variant="ghost"
                            >
                              keep
                            </Button>
                          </>
                        ) : (
                          <Button
                            aria-label={`Delete ${list.title}`}
                            onPress={() => setConfirmingListId(list.id)}
                            size="sm"
                            variant="ghost"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="hidden sm:inline">delete</span>
                          </Button>
                        )
                      ) : null}
                      <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                        open →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10">
                <p className="text-base text-muted-foreground">
                  No lists yet. Create one to get started.
                </p>
                <Button
                  className="mt-6 h-11 w-full text-base sm:hidden"
                  isDisabled={isCreating}
                  onPress={() => void createList()}
                >
                  <Plus className="size-4" />
                  {isCreating ? "Creating…" : "Create a new list"}
                </Button>
              </div>
            )}
            {error ? (
              <p className="mt-4 border-t border-destructive/40 pt-3 font-mono text-[10px] tracking-wide text-destructive uppercase">
                {error}
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
