import type { ListSummary } from "@jfa.dev/common/lists";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { KewekeHeader } from "@/app/components/keweke-header";
import { ensureLocalIdentity } from "@/features/auth/lib/local-identity";
import { EmptyListsState } from "@/features/lists/components/empty-lists-state";
import { ListsCatalog } from "@/features/lists/components/lists-catalog";
import { ListsPageHeader } from "@/features/lists/components/lists-page-header";
import { removeRemoteList } from "@/features/lists/lib/list-repository";
import {
  createLocalList,
  deleteLocalList,
  listLocalLists,
  subscribeToLocalLists,
} from "@/features/lists/lib/local-list-store";
import { syncRemoteLists } from "@/features/sync/lib/remote-list-sync";

const REMOTE_LIST_SYNC_INTERVAL_MS = 60_000;

export const Route = createFileRoute("/")({ component: EmptyState });

/* -------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------- */

function EmptyState() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmingListId, setConfirmingListId] = useState<string>();
  const [deletingListId, setDeletingListId] = useState<string>();

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
          const nextLists = await listLocalLists();
          setLists(nextLists);
          setIsLoading(false);
        }
      }
    };

    void syncLists();
    const interval = window.setInterval(() => void syncLists(), REMOTE_LIST_SYNC_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const removeList = useCallback(async (list: ListSummary): Promise<void> => {
    setDeletingListId(list.id);
    try {
      if (list.backend === "local") {
        await deleteLocalList(list.id);
      } else {
        await removeRemoteList(list.id);
      }
      setConfirmingListId(undefined);
    } catch {
      toast.error(
        list.backend === "local"
          ? "Could not delete that local list."
          : "Could not remove that remote list.",
      );
    } finally {
      setDeletingListId(undefined);
    }
  }, []);

  const cancelDelete = useCallback(() => setConfirmingListId(undefined), []);
  const confirmDelete = useCallback((listId: string) => setConfirmingListId(listId), []);
  const onRemove = useCallback((list: ListSummary) => void removeList(list), [removeList]);

  const createList = async (): Promise<void> => {
    setIsCreating(true);
    try {
      const result = await createLocalList();
      await navigate({ to: "/$listId", params: { listId: result.id } });
    } finally {
      setIsCreating(false);
    }
  };

  useHotkeys(
    useMemo(
      () =>
        lists.slice(0, 9).map((list, index) => ({
          hotkey: { key: `${index + 1}`, mod: true, shift: true },
          callback: () =>
            void navigate({ to: "/$listId", params: { listId: list.alias ?? list.id } }),
        })),
      [lists, navigate],
    ),
    { enabled: !isLoading && lists.length > 0 },
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-screen-2xl flex-col border-x border-border bg-background text-foreground">
      <KewekeHeader hideNewListButton={!isLoading && lists.length === 0} />
      <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain">
        <ListsPageHeader listCount={lists.length} />

        {isLoading ? (
          <p className="px-4 py-10 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase sm:px-6 lg:px-8">
            reading local storage…
          </p>
        ) : lists.length > 0 ? (
          <>
            <ListsCatalog
              confirmingListId={confirmingListId}
              deletingListId={deletingListId}
              lists={lists}
              onCancelDelete={cancelDelete}
              onConfirmDelete={confirmDelete}
              onRemove={onRemove}
            />
          </>
        ) : (
          <EmptyListsState isCreating={isCreating} onCreate={() => void createList()} />
        )}
      </main>
    </div>
  );
}
