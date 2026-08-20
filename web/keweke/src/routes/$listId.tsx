import {
  applyListMutation,
  type ListCommand,
  type ListItem,
  type ListSnapshot,
} from "@jfa.dev/common/lists";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { uuidv7 } from "uuidv7";

import { KewekeHeader } from "@/app/components/keweke-header";
import {
  ensureLocalIdentity,
  subscribeToLocalIdentity,
  type LocalIdentity,
} from "@/features/auth/lib/local-identity";
import { DeletedItemsHistory } from "@/features/lists/components/deleted-items-history";
import { ItemEntryHelpDialog } from "@/features/lists/components/item-entry-help-dialog";
import { ItemHistoryDialog } from "@/features/lists/components/item-history-dialog";
import type { ItemEditDraft, NewItemDraft } from "@/features/lists/components/list-item-types";
import { ListPageHeader } from "@/features/lists/components/list-page-header";
import { PublishListDialog } from "@/features/lists/components/publish-list-dialog";
import { ShoppingTable } from "@/features/lists/components/shopping-table";
import {
  hasItemDraftErrors,
  validateItemDraft,
  type ItemDraftErrors,
} from "@/features/lists/lib/item-draft";
import { isListAddress } from "@/features/lists/lib/list-id";
import {
  applyMutation,
  createMutation,
  ensureListAlias,
  loadList,
  migrateList,
} from "@/features/lists/lib/list-repository";
import { deleteLocalList } from "@/features/lists/lib/local-list-store";
import { listShareDescription, type ListShareMeta } from "@/features/lists/lib/share-meta";
import { getListShareMeta, getRemoteList } from "@/features/lists/server/lists";
import { useRemoteListLiveSession } from "@/features/sync/hooks/use-remote-list-live";

type HistoryTarget = { itemId: string; itemName: string };
const EMPTY_ITEMS: ListItem[] = [];

export const Route = createFileRoute("/$listId")({
  beforeLoad: ({ params }) => {
    if (!isListAddress(params.listId)) {
      throw notFound();
    }
  },
  loader: async ({ params }): Promise<ListShareMeta | null> => {
    try {
      return await getListShareMeta({ data: params.listId });
    } catch {
      return null;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {};
    }
    const title = `${loaderData.title} - KEWEKE`;
    const description = listShareDescription(loaderData);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: ListPage,
});

function ListPage() {
  const { listId } = Route.useParams();
  const navigate = useNavigate();
  const [loadedList, setLoadedList] = useState<
    { backend: "local" | "remote"; snapshot: ListSnapshot } | undefined
  >();
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [userDialogMessage, setUserDialogMessage] = useState<string>();
  const [isItemEntryHelpOpen, setIsItemEntryHelpOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [busyArchiveId, setBusyArchiveId] = useState<string>();
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget>();
  const [unavailableReason, setUnavailableReason] = useState<string>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState("");
  const [newItemDraft, setNewItemDraft] = useState<NewItemDraft>({
    name: "",
    quantity: "1",
    unit: "",
    amount: "",
    category: "GENERAL",
  });
  const [newItemAttempted, setNewItemAttempted] = useState(false);
  const [newItemErrors, setNewItemErrors] = useState<ItemDraftErrors>({});
  const [identity, setIdentity] = useState<LocalIdentity>();

  useEffect(() => {
    let cancelled = false;
    const refreshIdentity = (): void => {
      void ensureLocalIdentity().then((nextIdentity) => {
        if (!cancelled) {
          setIdentity(nextIdentity);
        }
        return nextIdentity;
      });
    };
    refreshIdentity();
    const unsubscribe = subscribeToLocalIdentity(refreshIdentity);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void loadList(listId)
      .then((nextList) => {
        if (!cancelled) {
          setLoadedList(nextList ?? undefined);
          setIsLoading(false);
        }
        return nextList;
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedList(undefined);
          setUnavailableReason("This list could not be opened.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [listId]);

  useEffect(() => {
    if (!newItemAttempted) {
      return;
    }
    setNewItemErrors(validateItemDraft(newItemDraft));
  }, [newItemAttempted, newItemDraft]);

  const remoteListId = loadedList?.backend === "remote" ? loadedList.snapshot.id : undefined;

  const { refresh: refreshLiveSession, status: liveStatus } = useRemoteListLiveSession(
    remoteListId,
    {
      onSnapshot: (nextSnapshot) => {
        setLoadedList((current) => {
          if (
            !current ||
            current.backend !== "remote" ||
            current.snapshot.id !== nextSnapshot.id ||
            nextSnapshot.revision < current.snapshot.revision
          ) {
            return current;
          }
          return { backend: "remote", snapshot: nextSnapshot };
        });
      },
      onMutation: (mutation, appliedAt) => {
        setLoadedList((current) => {
          if (!current || current.backend !== "remote") {
            return current;
          }
          const next = applyListMutation(current.snapshot, mutation, appliedAt);
          return next ? { backend: "remote", snapshot: next } : current;
        });
      },
      onDeleted: () => {
        toast.info("This list no longer exists.");
        void navigate({ to: "/" });
      },
    },
  );

  const isLiveDropped = liveStatus === "disconnected" && loadedList?.backend === "remote";

  const handleRefreshLive = useCallback(async (): Promise<void> => {
    if (!remoteListId || isRefreshing) {
      return;
    }
    setIsRefreshing(true);
    try {
      const outcome = await refreshLiveSession();
      if (outcome === "reconnected") {
        toast.success("Live updates reconnected.");
        return;
      }

      // A dropped socket alone does not say why. Ask the server whether the
      // list still exists before deciding how to guide the user.
      let listStillExists = true;
      try {
        listStillExists = (await getRemoteList({ data: remoteListId })) !== null;
      } catch {
        // The remote service could not answer; treat the failure as unrecoverable.
      }
      if (!listStillExists) {
        await deleteLocalList(remoteListId);
        toast.info("This list no longer exists.");
        await navigate({ to: "/" });
        return;
      }
      toast.error("Could not restore live updates for this list.");
      await navigate({ to: "/" });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, navigate, refreshLiveSession, remoteListId]);

  const commit = useCallback(
    async (command: ListCommand): Promise<ListSnapshot | null> => {
      if (!loadedList) {
        return null;
      }
      if (!identity) {
        toast.error("Your local identity is still being prepared. Try again in a moment.");
        return null;
      }

      let result;
      try {
        result = await applyMutation(
          loadedList.snapshot.id,
          loadedList.backend,
          await createMutation(loadedList.snapshot, command, identity, loadedList.backend),
        );
      } catch {
        toast.error(
          loadedList.backend === "remote"
            ? "Set up an accepted named user before changing a remote list."
            : "Could not prepare this change.",
        );
        return null;
      }
      if (result.status === "missing") {
        toast.error("This list no longer exists.");
        return null;
      }
      if (result.status === "conflict") {
        setLoadedList({ backend: loadedList.backend, snapshot: result.snapshot });
        toast.error("This list changed elsewhere. Your view was refreshed.");
        return null;
      }
      if (result.status === "unauthorized") {
        toast.error("This user is not allowed to change the remote list.");
        return null;
      }

      setLoadedList({ backend: loadedList.backend, snapshot: result.snapshot });
      return result.snapshot;
    },
    [identity, loadedList],
  );

  const migrate = useCallback(async (): Promise<void> => {
    if (!loadedList || loadedList.backend !== "local") {
      return;
    }

    setIsMigrating(true);
    try {
      const result = await migrateList(loadedList.snapshot);
      if (result.status === "unauthorized") {
        toast.error("Set up an accepted named user before publishing this list.");
        return;
      }
      if (result.status === "conflict") {
        toast.error("A remote list already exists for this identifier.");
        return;
      }
      if (result.status === "alias-conflict") {
        toast.error("That friendly address is already in use. Choose another one.");
        return;
      }

      setLoadedList({ backend: "remote", snapshot: result.snapshot });
      setIsPublishConfirmOpen(false);
    } catch {
      toast.error("Remote migration is not available right now.");
    } finally {
      setIsMigrating(false);
    }
  }, [loadedList]);

  const requestMigration = useCallback((): void => {
    if (!identity?.username) {
      setUserDialogMessage("You must create an user to publish remote lists.");
      setIsUserDialogOpen(true);
      return;
    }

    setIsPublishConfirmOpen(true);
  }, [identity?.username]);

  const handleUserDialogOpenChange = useCallback((isOpen: boolean): void => {
    setIsUserDialogOpen(isOpen);
    if (!isOpen) {
      setUserDialogMessage(undefined);
    }
  }, []);

  const handleUserDialogSaved = useCallback((): void => {
    if (!userDialogMessage) {
      return;
    }

    setIsUserDialogOpen(false);
    setUserDialogMessage(undefined);
    setIsPublishConfirmOpen(true);
  }, [userDialogMessage]);

  const confirmMigration = useCallback((): void => {
    void migrate();
  }, [migrate]);

  const renameList = useCallback(
    async (title: string): Promise<boolean> => {
      if (!loadedList) {
        return false;
      }

      setIsRenaming(true);
      try {
        const renamedSnapshot = await commit({ type: "rename-list", title });
        if (!renamedSnapshot) {
          return false;
        }

        if (renamedSnapshot.alias === null) {
          try {
            const result = await ensureListAlias(loadedList.backend, renamedSnapshot);
            setLoadedList({ backend: loadedList.backend, snapshot: result.snapshot });
            if (result.snapshot.alias) {
              await navigate({
                to: "/$listId",
                params: { listId: result.snapshot.alias },
                replace: true,
              });
            }
          } catch {
            toast.error("Could not create that friendly address. Try a few letters or numbers.");
          }
        }

        return true;
      } catch {
        toast.error("Could not save the list title right now.");
        return false;
      } finally {
        setIsRenaming(false);
      }
    },
    [commit, loadedList, navigate],
  );

  const updateItem = useCallback(
    async (itemId: string, draft: ItemEditDraft): Promise<boolean> => {
      if (hasItemDraftErrors(validateItemDraft(draft))) {
        return false;
      }
      const name = draft.name.trim();
      const quantity = Number(draft.quantity);
      const unit = draft.unit.trim();
      const amount = draft.amount.trim();
      const category = draft.category.trim();

      try {
        return (
          (await commit({
            type: "update-item",
            itemId,
            changes: { name, quantity, unit, amount, category },
          })) !== null
        );
      } catch {
        toast.error("Could not save the item right now.");
        return false;
      }
    },
    [commit],
  );

  const showHistory = useCallback((item: Pick<ListItem, "id" | "name">): void => {
    setHistoryTarget({ itemId: item.id, itemName: item.name });
  }, []);

  const hideHistory = useCallback((): void => {
    setHistoryTarget(undefined);
  }, []);

  const updateDeletedItem = useCallback(
    async (command: ListCommand, archiveId: string): Promise<void> => {
      setBusyArchiveId(archiveId);
      try {
        await commit(command);
      } catch {
        toast.error("Could not update deleted-item history right now.");
      } finally {
        setBusyArchiveId(undefined);
      }
    },
    [commit],
  );

  const updateNewItemDraft = useCallback((field: keyof NewItemDraft, value: string): void => {
    setNewItemDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const addItem = useCallback((): void => {
    const draftErrors = validateItemDraft(newItemDraft);
    if (hasItemDraftErrors(draftErrors)) {
      setNewItemAttempted(true);
      setNewItemErrors(draftErrors);
      return;
    }

    const name = newItemDraft.name.trim();
    const quantity = Number(newItemDraft.quantity);
    const unit = newItemDraft.unit.trim();
    const amount = newItemDraft.amount.trim();
    const category = newItemDraft.category.trim();

    void commit({
      type: "add-item",
      item: {
        id: uuidv7(),
        name,
        quantity,
        unit,
        amount,
        category,
      },
    }).then((committed) => {
      if (committed) {
        setNewItemAttempted(false);
        setNewItemErrors({});
        setNewItemDraft({
          name: "",
          quantity: "1",
          unit: "",
          amount: "",
          category: "GENERAL",
        });
      }
      return committed;
    });
  }, [commit, newItemDraft]);

  const toggleItem = useCallback(
    (id: string, checked: boolean): void => {
      void commit({ type: "set-item-checked", itemId: id, checked });
    },
    [commit],
  );

  const adjustQuantity = useCallback(
    (id: string, nextQuantity: number): void => {
      if (!Number.isInteger(nextQuantity) || nextQuantity < 1 || nextQuantity > 100_000) {
        return;
      }
      void commit({ type: "update-item", itemId: id, changes: { quantity: nextQuantity } });
    },
    [commit],
  );

  const removeItem = useCallback(
    (id: string): void => {
      void commit({ type: "remove-item", itemId: id });
    },
    [commit],
  );

  const snapshot = loadedList?.snapshot;
  const items = snapshot?.items ?? EMPTY_ITEMS;
  const activeCount = items.filter((item) => !item.checked).length;
  const completedCount = items.length - activeCount;

  useEffect(() => {
    document.title = snapshot ? `${snapshot.title} - KEWEKE` : "keweke";
  }, [snapshot]);

  const visibleItems = useMemo(() => {
    const normalizedFilter = filter.trim().toLowerCase();
    if (!normalizedFilter) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.category, item.unit, item.amount].some((value) =>
        value.toLowerCase().includes(normalizedFilter),
      ),
    );
  }, [filter, items]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
        <KewekeHeader listId={listId} />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            loading list…
          </p>
        </main>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
        <KewekeHeader listId={listId} />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8">
          <section className="invoice-paper invoice-rule border border-t-4 border-t-destructive">
            <div className="px-4 py-10 sm:px-8 sm:py-16">
              <p className="font-mono text-[11px] tracking-[0.12em] text-destructive uppercase">
                list unavailable
              </p>
              <h1 className="mt-3 text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl">
                Nothing here
              </h1>
              <p className="mt-6 max-w-lg text-sm text-muted-foreground">
                {unavailableReason ?? "This list is not available in local or remote storage."}
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <KewekeHeader
        backend={loadedList.backend}
        isMigrating={isMigrating}
        listId={listId}
        onMigrate={requestMigration}
        isUserDialogOpen={isUserDialogOpen}
        onUserDialogOpenChange={handleUserDialogOpenChange}
        onUserDialogSaved={handleUserDialogSaved}
        userDialogMessage={userDialogMessage}
      />
      <PublishListDialog
        alias={snapshot.alias}
        isOpen={isPublishConfirmOpen}
        isPublishing={isMigrating}
        listId={snapshot.id}
        onConfirm={confirmMigration}
        onOpenChange={setIsPublishConfirmOpen}
      />
      <ItemEntryHelpDialog isOpen={isItemEntryHelpOpen} onOpenChange={setIsItemEntryHelpOpen} />
      {historyTarget ? (
        <ItemHistoryDialog
          isOpen
          itemId={historyTarget.itemId}
          itemName={historyTarget.itemName}
          key={historyTarget.itemId}
          listId={snapshot.id}
          onOpenChange={(nextIsOpen) => {
            if (!nextIsOpen) {
              hideHistory();
            }
          }}
        />
      ) : null}
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <ListPageHeader
          activeCount={activeCount}
          alias={snapshot.alias}
          backend={loadedList.backend}
          completedCount={completedCount}
          filter={filter}
          isLiveDropped={isLiveDropped}
          isRefreshing={isRefreshing}
          isRenaming={isRenaming}
          listId={snapshot.id}
          onFilterChange={setFilter}
          onOpenHelp={() => setIsItemEntryHelpOpen(true)}
          onRefresh={() => void handleRefreshLive()}
          onRename={renameList}
          title={snapshot.title}
        />
        <ShoppingTable
          emptyMessage={filter.trim() ? "no matching lines" : undefined}
          identity={identity}
          items={visibleItems}
          newItem={newItemDraft}
          newItemErrors={newItemErrors}
          onAdd={addItem}
          onAdjustQuantity={adjustQuantity}
          onNewItemChange={updateNewItemDraft}
          onRemove={removeItem}
          onShowHistory={loadedList.backend === "remote" ? showHistory : undefined}
          onToggle={toggleItem}
          onUpdate={updateItem}
        />
        <DeletedItemsHistory
          busyArchiveId={busyArchiveId}
          identity={identity}
          items={snapshot.deletedItems}
          onPurge={(archiveId) => {
            void updateDeletedItem({ type: "purge-deleted-item", archiveId }, archiveId);
          }}
          onRestore={(archiveId) => {
            void updateDeletedItem({ type: "restore-item", archiveId }, archiveId);
          }}
          onShowHistory={loadedList.backend === "remote" ? showHistory : undefined}
        />
      </main>
    </div>
  );
}
