import {
  applyListMutation,
  type ListCommand,
  type ListItem,
  type ListSnapshot,
} from "@jfa.dev/common/lists";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { uuidv7 } from "uuidv7";

import { KewekeHeader } from "@/app/components/keweke-header";
import { useIsDesktop } from "@/app/hooks/use-desktop-media-query";
import { shouldShowPublishNudge } from "@/app/lib/publish-nudge";
import { ListIdentityCallout } from "@/features/auth/components/list-identity-callout";
import {
  ensureLocalIdentity,
  subscribeToLocalIdentity,
  type LocalIdentity,
} from "@/features/auth/lib/local-identity";
import { DeletedItemsHistory } from "@/features/lists/components/deleted-items-history";
import { DuplicateItemDialog } from "@/features/lists/components/duplicate-item-dialog";
import { ItemEntryHelpDialog } from "@/features/lists/components/item-entry-help-dialog";
import { ItemHistoryDialog } from "@/features/lists/components/item-history-dialog";
import { QuotedItemName } from "@/features/lists/components/list-item-elements";
import type { ItemEditDraft, NewItemDraft } from "@/features/lists/components/list-item-types";
import { ListPageHeader } from "@/features/lists/components/list-page-header";
import { LIST_VIEW_PANEL_ID } from "@/features/lists/components/list-view-tabs";
import { MobileNewItemDrawer } from "@/features/lists/components/mobile-shopping-table";
import { PublishListDialog } from "@/features/lists/components/publish-list-dialog";
import { ShoppingTable } from "@/features/lists/components/shopping-table";
import { NEW_SPREADSHEET_ROW_ID } from "@/features/lists/components/spreadsheet-mode";
import {
  buildInventoryIndex,
  matchInventoryName,
  type InventoryMatch,
} from "@/features/lists/lib/inventory-match";
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
import { itemsForListView, parseListView, type ListView } from "@/features/lists/lib/list-view";
import {
  deleteLocalList,
  listLocalLists,
  subscribeToLocalLists,
} from "@/features/lists/lib/local-list-store";
import { listShareDescription, type ListShareMeta } from "@/features/lists/lib/share-meta";
import { getListShareMeta, getRemoteList } from "@/features/lists/server/lists";
import { useRemoteListLiveSession } from "@/features/sync/hooks/use-remote-list-live";

type HistoryTarget = { itemId: string; itemName: string };
const EMPTY_ITEMS: ListItem[] = [];

/** A draft held back while the user decides about an apparent duplicate. */
type PendingDuplicate = { draft: NewItemDraft; match: InventoryMatch };

export const FOCUS_SEARCH_HOTKEY = "F";
export const FOCUS_NEW_ITEM_HOTKEY = "N";

type ListSearch = {
  tab?: string;
};

type ValidatedListSearch = {
  tab?: "inventory";
};

export const Route = createFileRoute("/$listId")({
  validateSearch: (search: ListSearch): ValidatedListSearch =>
    search.tab === "inventory" ? { tab: "inventory" } : {},
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
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const view = parseListView(tab);
  const [loadedList, setLoadedList] = useState<
    { backend: "local" | "remote"; snapshot: ListSnapshot } | undefined
  >();
  const [loadedRequestId, setLoadedRequestId] = useState<string>();
  const [isMigrating, setIsMigrating] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [userDialogMessage, setUserDialogMessage] = useState<string>();
  const [userDialogPurpose, setUserDialogPurpose] = useState<"identity" | "publish">("identity");
  const [publishError, setPublishError] = useState<string>();
  const [isItemEntryHelpOpen, setIsItemEntryHelpOpen] = useState(false);
  const [isSpreadsheetMode, setIsSpreadsheetMode] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [busyArchiveId, setBusyArchiveId] = useState<string>();
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget>();
  const [unavailableReason, setUnavailableReason] = useState<string>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFirstList, setIsFirstList] = useState(false);
  const [filter, setFilter] = useState("");
  const [isNewItemDrawerOpen, setIsNewItemDrawerOpen] = useState(false);
  const [keepAddingItems, setKeepAddingItems] = useState(false);
  const [newItemDraft, setNewItemDraft] = useState<NewItemDraft>({
    name: "",
    quantity: "1",
    unit: "",
    amount: "",
    category: "GENERAL",
  });
  const [newItemAttempted, setNewItemAttempted] = useState(false);
  const [newItemErrors, setNewItemErrors] = useState<ItemDraftErrors>({});
  const [pendingDuplicate, setPendingDuplicate] = useState<PendingDuplicate>();
  const [isAddingDuplicate, setIsAddingDuplicate] = useState(false);
  const [identity, setIdentity] = useState<LocalIdentity>();

  if (isDesktop && isNewItemDrawerOpen) {
    setIsNewItemDrawerOpen(false);
  }

  const isSpreadsheetModeActive = isDesktop && isSpreadsheetMode;
  const handleSpreadsheetModeChange = useCallback(
    (isActive: boolean): void => {
      if (!isDesktop && isActive) {
        return;
      }
      setIsSpreadsheetMode(isActive);
    },
    [isDesktop],
  );

  const handleViewChange = useCallback(
    (nextView: ListView): void => {
      if (nextView === view) {
        return;
      }
      setFilter("");
      setIsNewItemDrawerOpen(false);
      void navigate({
        to: "/$listId",
        params: { listId },
        replace: true,
        search: { tab: nextView === "inventory" ? "inventory" : undefined },
      });
    },
    [listId, navigate, view],
  );

  const focusSearchInput = useCallback((): void => {
    const element = document.getElementById("filter-items");
    if (element instanceof HTMLInputElement) {
      element.focus();
      element.select();
    }
  }, []);

  const focusNewItemInput = useCallback((): void => {
    if (!isDesktop) {
      if (view === "list") {
        setIsNewItemDrawerOpen(true);
      }
      return;
    }
    const spreadsheetElement = document.querySelector<HTMLInputElement>(
      `[data-spreadsheet-row-id="${NEW_SPREADSHEET_ROW_ID}"][data-spreadsheet-field="name"]`,
    );
    const candidates = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[aria-label="New item name"]'),
    );
    const visibleCandidates = candidates.filter(
      (element) => element.offsetParent !== null && !element.disabled,
    );
    const visible = visibleCandidates[0] ?? spreadsheetElement;
    const target = visible ?? candidates[0] ?? spreadsheetElement;
    if (target) {
      target.focus();
      target.select();
    }
  }, [isDesktop, view]);

  useHotkeys(
    [
      { hotkey: FOCUS_SEARCH_HOTKEY, callback: focusSearchInput },
      { hotkey: FOCUS_NEW_ITEM_HOTKEY, callback: focusNewItemInput },
    ],
    { enabled: true },
  );

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
    void loadList(listId)
      .then((nextList) => {
        if (!cancelled) {
          setLoadedList(nextList ?? undefined);
          setLoadedRequestId(listId);
        }
        return nextList;
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedList(undefined);
          setUnavailableReason("This list could not be opened.");
          setLoadedRequestId(listId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [listId]);

  const isLoading = loadedRequestId !== listId;
  const currentUnavailableReason = loadedRequestId === listId ? unavailableReason : undefined;

  useEffect(() => {
    if (loadedList?.backend !== "local") {
      // oxlint-disable-next-line react/set-state-in-effect -- sync external IndexedDB list count to local flag
      setIsFirstList(false);
      return undefined;
    }

    let cancelled = false;
    const refreshFirstList = (): void => {
      void listLocalLists().then((lists) => {
        if (!cancelled) {
          // oxlint-disable-next-line react/set-state-in-effect -- async sync with IndexedDB via subscription
          setIsFirstList(lists.length === 1 && lists[0]?.id === loadedList.snapshot.id);
        }
        return lists;
      });
    };

    refreshFirstList();
    const unsubscribe = subscribeToLocalLists(refreshFirstList);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [loadedList?.backend, loadedList?.snapshot.id]);

  const displayedNewItemErrors = newItemAttempted ? validateItemDraft(newItemDraft) : newItemErrors;

  // Declared ahead of the add callbacks below so they can close over `items`.
  const snapshot = loadedList?.snapshot;
  const items = snapshot?.items ?? EMPTY_ITEMS;

  const activeCount = items.filter((item) => !item.checked).length;
  const completedCount = items.length - activeCount;

  // Item names are tokenised once per snapshot rather than once per keystroke;
  // a snapshot may hold thousands of items.
  const inventoryIndex = useMemo(() => buildInventoryIndex(items), [items]);
  const newItemMatch = useMemo(
    () => matchInventoryName(newItemDraft.name, inventoryIndex),
    [inventoryIndex, newItemDraft.name],
  );

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

  const handleRefreshLive = async (): Promise<void> => {
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
  };

  const commit = useCallback(
    async (command: ListCommand): Promise<ListSnapshot | null> => {
      if (!loadedList) {
        return null;
      }
      if (!identity) {
        return null;
      }
      if (loadedList.backend === "remote" && !identity.remoteUsername) {
        setUserDialogPurpose("identity");
        setUserDialogMessage(undefined);
        setIsUserDialogOpen(true);
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
        if (loadedList.backend === "remote" && !identity.remoteUsername) {
          setUserDialogPurpose("identity");
          setUserDialogMessage(undefined);
          setIsUserDialogOpen(true);
        } else {
          toast.error("Could not prepare this change.");
        }
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
    setPublishError(undefined);
    try {
      const result = await migrateList(loadedList.snapshot);
      if (result.status === "unauthorized") {
        setPublishError("Could not finish publishing this list. Try again.");
        return;
      }
      if (result.status === "conflict") {
        setPublishError("A remote list already exists for this identifier.");
        return;
      }
      if (result.status === "alias-conflict") {
        setPublishError("That friendly address is already in use. Choose another one.");
        return;
      }

      setLoadedList({ backend: "remote", snapshot: result.snapshot });
      setIsPublishConfirmOpen(false);
    } catch {
      setPublishError(
        "Could not publish this list right now. Check your connection and try again.",
      );
    } finally {
      setIsMigrating(false);
    }
  }, [loadedList]);

  const requestMigration = useCallback((): void => {
    if (!identity?.username) {
      setUserDialogPurpose("publish");
      setUserDialogMessage("Choose a name to continue.");
      setIsUserDialogOpen(true);
      return;
    }

    setPublishError(undefined);
    setIsPublishConfirmOpen(true);
  }, [identity?.username]);

  const handleUserDialogOpenChange = useCallback((isOpen: boolean): void => {
    setIsUserDialogOpen(isOpen);
    if (!isOpen) {
      setUserDialogMessage(undefined);
      setUserDialogPurpose("identity");
    }
  }, []);

  const handleUserDialogSaved = useCallback((): void => {
    if (userDialogPurpose !== "publish") {
      setIsUserDialogOpen(false);
      return;
    }

    if (!userDialogMessage) {
      return;
    }

    setIsUserDialogOpen(false);
    setUserDialogMessage(undefined);
    setIsPublishConfirmOpen(true);
  }, [userDialogMessage, userDialogPurpose]);

  const confirmMigration = useCallback((): void => {
    setPublishError(undefined);
    void migrate();
  }, [migrate]);

  const openIdentityDialog = useCallback((): void => {
    setUserDialogPurpose("identity");
    setUserDialogMessage(undefined);
    setIsUserDialogOpen(true);
  }, []);

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
      const item = loadedList?.snapshot.items.find((candidate) => candidate.id === itemId);
      if (hasItemDraftErrors(validateItemDraft(draft, { allowZeroQuantity: item?.checked }))) {
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
    [commit, loadedList],
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
        const item = loadedList?.snapshot.deletedItems.find(
          (candidate) => candidate.archiveId === archiveId,
        );
        const committed = await commit(command);
        if (committed && item) {
          if (command.type === "restore-item") {
            toast.success(
              <>
                <QuotedItemName name={item.name} /> restored to{" "}
                {item.checked ? "inventory" : "the list"}.
              </>,
            );
          } else if (command.type === "purge-deleted-item") {
            toast.success(
              <>
                <QuotedItemName name={item.name} /> permanently deleted.
              </>,
            );
          }
        }
      } catch {
        toast.error("Could not update deleted-item history right now.");
      } finally {
        setBusyArchiveId(undefined);
      }
    },
    [commit, loadedList],
  );

  const commitNewItem = useCallback(
    async (draft: NewItemDraft): Promise<boolean> => {
      const name = draft.name.trim();

      const committed = await commit({
        type: "add-item",
        item: {
          id: uuidv7(),
          name,
          quantity: Number(draft.quantity),
          unit: draft.unit.trim(),
          amount: draft.amount.trim(),
          category: draft.category.trim(),
        },
      });
      if (!committed) {
        return false;
      }

      setNewItemAttempted(false);
      setNewItemErrors({});
      setNewItemDraft({
        name: "",
        quantity: "1",
        unit: "",
        amount: "",
        category: "GENERAL",
      });
      if (isNewItemDrawerOpen) {
        if (keepAddingItems) {
          requestAnimationFrame(() => document.getElementById("new-item-mobile")?.focus());
        } else {
          setIsNewItemDrawerOpen(false);
        }
      }
      toast.success(
        <>
          <QuotedItemName name={name} /> added to the list.
        </>,
      );
      return true;
    },
    [commit, isNewItemDrawerOpen, keepAddingItems],
  );

  const addItem = useCallback(async (): Promise<boolean> => {
    const draftErrors = validateItemDraft(newItemDraft);
    if (hasItemDraftErrors(draftErrors)) {
      setNewItemAttempted(true);
      setNewItemErrors(draftErrors);
      return false;
    }

    // `inventoryIndex` tracks the current snapshot, so this is checked against
    // whatever the inventory holds now, not against a value cached at keystroke
    // time.
    const match = matchInventoryName(newItemDraft.name, inventoryIndex);
    if (match.status !== "none") {
      setPendingDuplicate({ draft: newItemDraft, match });
      return false;
    }

    return commitNewItem(newItemDraft);
  }, [commitNewItem, inventoryIndex, newItemDraft]);

  // Takes the pending draft as an argument rather than reading it from state, so
  // the callback never closes over a stale value.
  const confirmDuplicateAdd = useCallback(
    async (pending: PendingDuplicate): Promise<void> => {
      setIsAddingDuplicate(true);
      try {
        if (await commitNewItem(pending.draft)) {
          setPendingDuplicate(undefined);
        }
      } finally {
        setIsAddingDuplicate(false);
      }
    },
    // commitNewItem is read inside the async body, which the rule does not
    // track; dropping it would pin a stale commit and commit against an
    // outdated base revision.
    // oxlint-disable-next-line react/memo-dependencies -- read inside the async body
    [commitNewItem],
  );

  const updateNewItemDraft = useCallback((field: keyof NewItemDraft, value: string): void => {
    setNewItemDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const toggleItem = useCallback(
    (id: string, checked: boolean): void => {
      const item = loadedList?.snapshot.items.find((candidate) => candidate.id === id);
      void commit({ type: "set-item-checked", itemId: id, checked }).then((committed) => {
        if (!committed || !item) {
          return undefined;
        }
        toast.success(
          <>
            <QuotedItemName name={item.name} />{" "}
            {checked ? "purchased · moved to inventory." : "restored to the list."}
          </>,
        );
        return undefined;
      });
    },
    [commit, loadedList],
  );

  const adjustQuantity = useCallback(
    (id: string, nextQuantity: number): void => {
      const item = loadedList?.snapshot.items.find((candidate) => candidate.id === id);
      const minimumQuantity = item?.checked ? 0 : 1;
      if (
        !Number.isInteger(nextQuantity) ||
        nextQuantity < minimumQuantity ||
        nextQuantity > 100_000
      ) {
        return;
      }
      void commit({ type: "update-item", itemId: id, changes: { quantity: nextQuantity } });
    },
    [commit, loadedList],
  );

  const removeItem = useCallback(
    (id: string): void => {
      const item = loadedList?.snapshot.items.find((candidate) => candidate.id === id);
      void commit({ type: "remove-item", itemId: id }).then((committed) => {
        if (committed && item) {
          toast.success(
            <>
              <QuotedItemName name={item.name} /> deleted.
            </>,
          );
        }
        return undefined;
      });
    },
    [commit, loadedList],
  );

  const showPublishNudge = shouldShowPublishNudge({
    backend: loadedList?.backend,
    isFirstList,
    itemCount: items.length,
    title: snapshot?.title,
  });

  useEffect(() => {
    document.title = snapshot ? `${snapshot.title} - KEWEKE` : "keweke";
  }, [snapshot]);

  const viewItems = useMemo(() => itemsForListView(items, view), [items, view]);
  const visibleItems = useMemo(() => {
    const normalizedFilter = filter.trim().toLowerCase();
    if (!normalizedFilter) {
      return viewItems;
    }

    return viewItems.filter((item) =>
      [item.name, item.category, item.unit, item.amount].some((value) =>
        value.toLowerCase().includes(normalizedFilter),
      ),
    );
  }, [filter, viewItems]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-background text-foreground">
        <KewekeHeader listId={listId} />
        <div className="mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col border-x border-border bg-background">
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground">Loading list…</p>
          </main>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-background text-foreground">
        <KewekeHeader listId={listId} />
        <div className="mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col border-x border-border bg-background">
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8">
            <section className="max-w-prose">
              <h1 className="font-sans text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl">
                This list isn&apos;t here
              </h1>
              <p className="mt-4 text-sm text-muted-foreground">
                {currentUnavailableReason ??
                  "This list is not available in local or remote storage."}
              </p>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background text-foreground">
      <KewekeHeader
        backend={loadedList.backend}
        isMigrating={isMigrating}
        listId={listId}
        showPublishNudge={showPublishNudge}
        onMigrate={requestMigration}
        isUserDialogOpen={isUserDialogOpen}
        onUserDialogOpenChange={handleUserDialogOpenChange}
        onUserDialogSaved={handleUserDialogSaved}
        userDialogMessage={userDialogMessage}
        userDialogMessageTone="message"
        userDialogPurpose={userDialogPurpose}
      />
      <PublishListDialog
        alias={snapshot.alias}
        error={publishError}
        isOpen={isPublishConfirmOpen}
        isPublishing={isMigrating}
        listId={snapshot.id}
        onConfirm={confirmMigration}
        onOpenChange={setIsPublishConfirmOpen}
        willCreateRemoteUser={Boolean(identity?.username && !identity.remoteUsername)}
      />
      <ItemEntryHelpDialog isOpen={isItemEntryHelpOpen} onOpenChange={setIsItemEntryHelpOpen} />
      {pendingDuplicate ? (
        <DuplicateItemDialog
          draft={pendingDuplicate.draft}
          isOpen
          isAdding={isAddingDuplicate}
          match={pendingDuplicate.match}
          onAddAnyway={() => void confirmDuplicateAdd(pendingDuplicate)}
          onOpenChange={(nextIsOpen) => {
            if (!nextIsOpen) {
              setPendingDuplicate(undefined);
            }
          }}
        />
      ) : null}
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
      <div className="mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col border-x border-border bg-background">
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          {!identity ? (
            <ListIdentityCallout kind="loading" />
          ) : loadedList.backend === "remote" && !identity.remoteUsername ? (
            <ListIdentityCallout kind="remote" onAction={openIdentityDialog} />
          ) : loadedList.backend === "local" && isFirstList && !identity.username ? (
            <ListIdentityCallout kind="local" onAction={openIdentityDialog} />
          ) : null}
          <ListPageHeader
            activeCount={activeCount}
            alias={snapshot.alias}
            backend={loadedList.backend}
            completedCount={completedCount}
            filter={filter}
            isDesktop={isDesktop}
            isSpreadsheetMode={isSpreadsheetModeActive}
            isLiveDropped={isLiveDropped}
            isRefreshing={isRefreshing}
            isRenaming={isRenaming}
            listId={snapshot.id}
            onViewChange={handleViewChange}
            onFilterChange={setFilter}
            onOpenHelp={() => setIsItemEntryHelpOpen(true)}
            onRefresh={() => void handleRefreshLive()}
            onRename={renameList}
            onSpreadsheetModeChange={handleSpreadsheetModeChange}
            view={view}
            title={snapshot.title}
          />
          <section
            aria-labelledby={`list-view-tab-${view}`}
            className={
              view === "list" ? "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0" : undefined
            }
            id={LIST_VIEW_PANEL_ID}
            role="tabpanel"
            tabIndex={-1}
          >
            <div className="border-b px-4 py-5 sm:px-6 lg:px-8">
              <h2 className="text-xl leading-none font-semibold tracking-tight">
                {view === "inventory" ? "Inventory" : "List"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {view === "inventory"
                  ? `${viewItems.length} purchased ${viewItems.length === 1 ? "item" : "items"}`
                  : `${viewItems.length} ${viewItems.length === 1 ? "item" : "items"} to buy`}
              </p>
            </div>
            <ShoppingTable
              emptyMessage={
                filter.trim()
                  ? "No matching items"
                  : view === "inventory"
                    ? "No purchased items yet"
                    : undefined
              }
              identity={identity}
              isSpreadsheetMode={isSpreadsheetModeActive}
              items={visibleItems}
              key={view}
              newItem={newItemDraft}
              newItemErrors={displayedNewItemErrors}
              newItemMatch={newItemMatch}
              onAdd={addItem}
              onAdjustQuantity={adjustQuantity}
              onNewItemChange={updateNewItemDraft}
              onRemove={removeItem}
              onShowHistory={loadedList.backend === "remote" ? showHistory : undefined}
              onSpreadsheetModeChange={handleSpreadsheetModeChange}
              onToggle={toggleItem}
              onUpdate={updateItem}
              showNewItemRow={view === "list"}
            />
            {view === "list" ? (
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
            ) : null}
          </section>
        </main>
      </div>
      {!isDesktop && view === "list" ? (
        <MobileNewItemDrawer
          newItem={newItemDraft}
          errors={displayedNewItemErrors}
          inventoryMatch={newItemMatch}
          isOpen={isNewItemDrawerOpen}
          keepAdding={keepAddingItems}
          onAdd={addItem}
          onChange={updateNewItemDraft}
          onKeepAddingChange={setKeepAddingItems}
          onOpenChange={setIsNewItemDrawerOpen}
        />
      ) : null}
    </div>
  );
}
