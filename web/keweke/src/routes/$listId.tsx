import type { ListIdentity } from "@jfa.dev/common/identities";
import type { DeletedListItem, ListCommand, ListItem, ListSnapshot } from "@jfa.dev/common/lists";
import { Button, Checkbox, Input, TableCell } from "@jfa.dev/common/ui";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
  type ReactTable,
} from "@tanstack/react-table";
import {
  ArrowLeftRight,
  Check,
  Copy,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { v7 as uuidv7 } from "uuid";

import { KewekeHeader } from "@/components/keweke-header";
import { PublishListDialog } from "@/components/publish-list-dialog";
import { isListAddress } from "@/lib/list-id";
import {
  applyMutation,
  createMutation,
  ensureListAlias,
  loadList,
  migrateList,
} from "@/lib/list-repository";
import {
  ensureLocalIdentity,
  LOCAL_IDENTITY_PLACEHOLDER,
  subscribeToLocalIdentity,
  type LocalIdentity,
} from "@/lib/local-identity";
import { openRemoteListLiveSession } from "@/lib/remote-list-live";
import { appPath } from "@/lib/site-paths";

type ItemEditDraft = {
  name: string;
  quantity: string;
  unit: string;
  amount: string;
  category: string;
};

type NewItemDraft = ItemEditDraft;

type ShoppingTableMeta = {
  editDraft?: ItemEditDraft;
  editingItemId?: string;
  identity?: LocalIdentity;
  isSaving: boolean;
  onCancelEditing: () => void;
  onEditDraftChange: (field: keyof ItemEditDraft, value: string) => void;
  onRemove: (id: string) => void;
  onSaveEditing: () => void;
  onStartEditing: (item: ListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
};

const shoppingTableFeatures = tableFeatures({
  // SAFETY: TanStack consumes this metadata through the declared table feature contract.
  tableMeta: {} as ShoppingTableMeta,
});
const shoppingColumnHelper = createColumnHelper<typeof shoppingTableFeatures, ListItem>();
const EMPTY_ITEMS: ListItem[] = [];

type ShoppingTableInstance = ReactTable<typeof shoppingTableFeatures, ListItem>;

export const Route = createFileRoute("/$listId")({
  beforeLoad: ({ params }) => {
    if (!isListAddress(params.listId)) {
      throw notFound();
    }
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
  const [isRenaming, setIsRenaming] = useState(false);
  const [busyArchiveId, setBusyArchiveId] = useState<string>();
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState("");
  const [newItemDraft, setNewItemDraft] = useState<NewItemDraft>({
    name: "",
    quantity: "1",
    unit: "EA",
    amount: "",
    category: "GENERAL",
  });
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
    setError(undefined);
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
          setError("This list could not be opened.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [listId]);

  const remoteListId = loadedList?.backend === "remote" ? loadedList.snapshot.id : undefined;

  useEffect(() => {
    if (!remoteListId) {
      return undefined;
    }

    let cancelled = false;
    let reconnectTimer: number | undefined;
    let reconnectAttempt = 0;
    let webSocket: WebSocket | undefined;

    const connect = (): void => {
      if (cancelled) {
        return;
      }

      webSocket = openRemoteListLiveSession(remoteListId, {
        onOpen: () => {
          reconnectAttempt = 0;
        },
        onSnapshot: (nextSnapshot) => {
          if (cancelled) {
            return;
          }
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
        onDeleted: () => {
          if (!cancelled) {
            setLoadedList(undefined);
            setError("This list no longer exists.");
          }
        },
        onClose: () => {
          if (cancelled) {
            return;
          }
          const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempt);
          reconnectAttempt += 1;
          reconnectTimer = window.setTimeout(connect, delay);
        },
      });
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
      }
      webSocket?.close(1000, "Leaving list");
    };
  }, [remoteListId]);

  const commit = useCallback(
    async (command: ListCommand): Promise<ListSnapshot | null> => {
      if (!loadedList) {
        return null;
      }
      if (!identity) {
        setError("Your local identity is still being prepared. Try again in a moment.");
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
        setError(
          loadedList.backend === "remote"
            ? "Set up an accepted named user before changing a remote list."
            : "Could not prepare this change.",
        );
        return null;
      }
      if (result.status === "missing") {
        setError("This list no longer exists.");
        return null;
      }
      if (result.status === "conflict") {
        setLoadedList({ backend: loadedList.backend, snapshot: result.snapshot });
        setError("This list changed elsewhere. Your view was refreshed.");
        return null;
      }
      if (result.status === "unauthorized") {
        setError("This user is not allowed to change the remote list.");
        return null;
      }

      setLoadedList({ backend: loadedList.backend, snapshot: result.snapshot });
      setError(undefined);
      return result.snapshot;
    },
    [identity, loadedList],
  );

  const migrate = useCallback(async (): Promise<void> => {
    if (!loadedList || loadedList.backend !== "local") {
      return;
    }

    setIsMigrating(true);
    setError(undefined);
    try {
      const result = await migrateList(loadedList.snapshot);
      if (result.status === "unauthorized") {
        setError("Set up an accepted named user before publishing this list.");
        return;
      }
      if (result.status === "conflict") {
        setError("A remote list already exists for this identifier.");
        return;
      }
      if (result.status === "alias-conflict") {
        setError("That friendly address is already in use. Choose another one.");
        return;
      }

      setLoadedList({ backend: "remote", snapshot: result.snapshot });
      setError(undefined);
      setIsPublishConfirmOpen(false);
    } catch {
      setError("Remote migration is not available right now.");
    } finally {
      setIsMigrating(false);
    }
  }, [loadedList]);

  const requestMigration = useCallback((): void => {
    if (!identity?.username) {
      setUserDialogMessage("You must create a local user to publish remote lists.");
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
            setError(undefined);
            if (result.snapshot.alias) {
              await navigate({
                to: "/$listId",
                params: { listId: result.snapshot.alias },
                replace: true,
              });
            }
          } catch {
            setError("Could not create that friendly address. Try a few letters or numbers.");
          }
        }

        return true;
      } catch {
        setError("Could not save the list title right now.");
        return false;
      } finally {
        setIsRenaming(false);
      }
    },
    [commit, loadedList, navigate],
  );

  const updateItem = useCallback(
    async (itemId: string, draft: ItemEditDraft): Promise<boolean> => {
      const name = draft.name.trim();
      const quantity = Number(draft.quantity);
      const unit = draft.unit.trim();
      const amount = draft.amount.trim();
      const category = draft.category.trim();
      if (
        !name ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        !unit ||
        amount.length > 64 ||
        !category
      ) {
        setError("Enter a name, whole quantity, unit, and category.");
        return false;
      }

      try {
        return (
          (await commit({
            type: "update-item",
            itemId,
            changes: { name, quantity, unit, amount, category },
          })) !== null
        );
      } catch {
        setError("Could not save the item right now.");
        return false;
      }
    },
    [commit],
  );

  const updateDeletedItem = useCallback(
    async (command: ListCommand, archiveId: string): Promise<void> => {
      setBusyArchiveId(archiveId);
      try {
        await commit(command);
      } catch {
        setError("Could not update deleted-item history right now.");
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
    const name = newItemDraft.name.trim();
    const quantity = Number.parseInt(newItemDraft.quantity, 10);
    const unit = newItemDraft.unit.trim();
    const amount = newItemDraft.amount.trim();
    const category = newItemDraft.category.trim();
    if (
      !name ||
      !Number.isFinite(quantity) ||
      quantity < 1 ||
      !unit ||
      unit.length > 32 ||
      amount.length > 64 ||
      !category
    ) {
      return;
    }

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
        setNewItemDraft({
          name: "",
          quantity: "1",
          unit: "EA",
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
                {error ?? "This list is not available in local or remote storage."}
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
        error={error}
        isOpen={isPublishConfirmOpen}
        isPublishing={isMigrating}
        listId={snapshot.id}
        onConfirm={confirmMigration}
        onOpenChange={setIsPublishConfirmOpen}
      />
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="invoice-rule flex flex-col gap-5 border-b px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
          <div>
            <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {loadedList.backend} list
            </p>
            <ListTitleEditor isSaving={isRenaming} onSave={renameList} title={snapshot.title} />
            <ListAlias alias={snapshot.alias} listId={snapshot.id} />
          </div>
          <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            {String(activeCount).padStart(2, "0")} open · {String(completedCount).padStart(2, "0")}{" "}
            done
          </p>
        </div>

        {error ? (
          <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 font-mono text-[10px] tracking-wide text-destructive uppercase sm:px-6 lg:px-8">
            {error}
          </div>
        ) : null}

        <div className="invoice-rule border-b px-4 py-3 sm:px-6 lg:px-8">
          <div className="relative w-full">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="filter-items"
              aria-label="Search items"
              className="w-full max-w-none pl-10 font-serif text-base sm:text-[11px]"
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search items"
              value={filter}
            />
          </div>
        </div>
        <ShoppingTable
          emptyMessage={filter.trim() ? "no matching lines" : undefined}
          identity={identity}
          items={visibleItems}
          newItem={newItemDraft}
          onAdd={addItem}
          onNewItemChange={updateNewItemDraft}
          onRemove={removeItem}
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
        />
      </main>
    </div>
  );
}

function ListTitleEditor({
  isSaving,
  onSave,
  title,
}: {
  isSaving: boolean;
  onSave: (title: string) => Promise<boolean>;
  title: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);

  useEffect(() => {
    if (!isEditing) {
      setValue(title);
    }
  }, [isEditing, title]);

  if (!isEditing) {
    return (
      <div className="mt-1 flex items-center gap-1">
        <h1 className="font-serif text-xl leading-none font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        <Button
          aria-label="Edit list title"
          onPress={() => setIsEditing(true)}
          size="icon"
          variant="ghost"
        >
          <Pencil className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <form
      className="mt-1 flex max-w-md items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        const nextTitle = value.trim();
        if (!nextTitle || nextTitle === title) {
          setIsEditing(false);
          return;
        }
        void onSave(nextTitle).then((saved) => {
          if (saved) {
            setIsEditing(false);
          }
          return saved;
        });
      }}
    >
      <label className="sr-only" htmlFor="list-title">
        List title
      </label>
      <Input
        id="list-title"
        aria-label="List title"
        className="min-w-44 flex-1 font-serif text-lg font-semibold"
        disabled={isSaving}
        maxLength={160}
        onChange={(event) => setValue(event.target.value)}
        value={value}
      />
      <Button isDisabled={isSaving} size="sm" type="submit">
        {isSaving ? "Saving" : "Save"}
      </Button>
      <Button
        isDisabled={isSaving}
        onPress={() => setIsEditing(false)}
        size="sm"
        type="button"
        variant="ghost"
      >
        Cancel
      </Button>
    </form>
  );
}

function ListAlias({ alias, listId }: { alias: string | null; listId: string }) {
  const [showListId, setShowListId] = useState(alias === null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setShowListId(alias === null);
    setIsCopied(false);
  }, [alias, listId]);

  const identifier = showListId || alias === null ? listId : alias;
  const label = showListId || alias === null ? "ID" : "Alias";

  const copyUrl = async (): Promise<void> => {
    try {
      const url = new URL(appPath(identifier), window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <div className="mt-2 flex max-w-full min-w-0 items-center gap-1 overflow-hidden font-mono text-[10px] tracking-[0.08em] uppercase">
      {alias ? (
        <Button
          aria-label={`Show ${showListId ? "Alias" : "ID"}`}
          className="h-7 gap-1 px-1 text-[10px] tracking-[0.08em] text-muted-foreground uppercase"
          onPress={() => {
            setShowListId((current) => !current);
            setIsCopied(false);
          }}
          size="sm"
          variant="ghost"
        >
          {label}
          <ArrowLeftRight aria-hidden="true" className="size-2.5" />
        </Button>
      ) : (
        <span className="shrink-0 text-muted-foreground">{label}</span>
      )}
      <span aria-hidden="true" className="shrink-0 text-muted-foreground">
        /
      </span>
      <span className="min-w-0 flex-1 truncate text-primary" title={identifier}>
        {identifier}
      </span>
      <Button
        aria-label={isCopied ? "Copied list URL" : `Copy full ${label} URL`}
        className="size-7 p-0 text-primary"
        onPress={() => void copyUrl()}
        size="icon"
        variant="ghost"
      >
        {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
    </div>
  );
}

const IDENTITY_COLORS = [
  "bg-primary",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-violet-500",
] as const;

function identityColor(identityId: string): (typeof IDENTITY_COLORS)[number] {
  const hash = Array.from(identityId).reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  );
  return IDENTITY_COLORS[hash % IDENTITY_COLORS.length];
}

function identityDisplayName(actor: ListIdentity, currentIdentity?: LocalIdentity): string {
  if (currentIdentity?.userId === actor.id) {
    const currentUsername = currentIdentity.remoteUsername ?? currentIdentity.username;
    if (currentUsername) {
      return currentUsername;
    }
  }

  return actor.username ?? LOCAL_IDENTITY_PLACEHOLDER;
}

function SignedItemBadge({
  identity,
  item,
}: {
  identity?: LocalIdentity;
  item: Pick<ListItem, "createdAt" | "createdBy" | "updatedAt" | "updatedBy">;
}) {
  const wasEdited =
    item.updatedAt !== item.createdAt ||
    (item.createdBy !== null && item.updatedBy !== null && item.createdBy.id !== item.updatedBy.id);
  const actor = (wasEdited ? item.updatedBy : item.createdBy) ?? item.updatedBy ?? item.createdBy;
  if (!actor) {
    return (
      <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
        unsigned
      </span>
    );
  }

  const action = wasEdited ? "edited by" : "added by";
  const actorName = identityDisplayName(actor, identity);
  const createdBy = item.createdBy
    ? `Added by ${identityDisplayName(item.createdBy, identity)}`
    : undefined;
  const updatedBy = item.updatedBy
    ? `Last edited by ${identityDisplayName(item.updatedBy, identity)}`
    : undefined;
  const title = [createdBy, wasEdited ? updatedBy : undefined].filter(Boolean).join(" · ");

  return (
    <span
      aria-label={`${action} ${actorName}`}
      className="inline-flex max-w-full items-center gap-1 truncate text-[10px] tracking-[0.06em] text-muted-foreground"
      title={title}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${identityColor(actor.id)}`}
      />
      <span className="truncate font-mono uppercase">{action}</span>
      <span className="truncate font-serif">{actorName}</span>
    </span>
  );
}

function ItemMeasure({ item }: { item: Pick<ListItem, "quantity" | "unit" | "amount"> }) {
  return (
    <>
      <span className="font-mono">{item.quantity}</span>{" "}
      <span className="font-serif">{item.unit}</span>
      {item.amount ? (
        <>
          {" ("}
          <span className="font-serif">{item.amount}</span>
          <span className="font-mono"> each)</span>
        </>
      ) : null}
    </>
  );
}

function ShoppingTable({
  emptyMessage,
  identity,
  items,
  newItem,
  onAdd,
  onNewItemChange,
  onRemove,
  onToggle,
  onUpdate,
}: {
  emptyMessage?: string;
  identity?: LocalIdentity;
  items: ListItem[];
  newItem: NewItemDraft;
  onAdd: () => void;
  onNewItemChange: (field: keyof NewItemDraft, value: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string, checked: boolean) => void;
  onUpdate: (itemId: string, draft: ItemEditDraft) => Promise<boolean>;
}) {
  const [editingItemId, setEditingItemId] = useState<string>();
  const [editDraft, setEditDraft] = useState<ItemEditDraft>();
  const [isSaving, setIsSaving] = useState(false);

  const submitNewItemOnEnter = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        event.preventDefault();
        onAdd();
      }
    },
    [onAdd],
  );

  const startEditing = useCallback((item: ListItem): void => {
    setEditingItemId(item.id);
    setEditDraft({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      amount: item.amount,
      category: item.category,
    });
  }, []);

  const updateDraft = useCallback((field: keyof ItemEditDraft, value: string): void => {
    setEditDraft((current) => (current ? { ...current, [field]: value } : current));
  }, []);

  const cancelEditing = useCallback((): void => {
    setEditingItemId(undefined);
    setEditDraft(undefined);
  }, []);

  const saveEditing = useCallback(async (): Promise<void> => {
    if (!editingItemId || !editDraft || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      if (await onUpdate(editingItemId, editDraft)) {
        cancelEditing();
      }
    } finally {
      setIsSaving(false);
    }
  }, [cancelEditing, editDraft, editingItemId, isSaving, onUpdate]);

  // Keep these cell definitions stable. TanStack renders each cell function as
  // a React component, so recreating them for every draft update remounts the
  // controlled input and drops the browser's focus after one character.
  const columns = useMemo(() => createShoppingColumns(), []);
  const mobileColumns = useMemo(
    () =>
      createMobileShoppingColumns({
        identity,
        isSaving,
        onRemove,
        onStartEditing: startEditing,
        onToggle,
      }),
    [identity, isSaving, onRemove, onToggle, startEditing],
  );
  const tableMeta = useMemo<ShoppingTableMeta>(
    () => ({
      editDraft,
      editingItemId,
      identity,
      isSaving,
      onCancelEditing: cancelEditing,
      onEditDraftChange: updateDraft,
      onRemove,
      onSaveEditing: saveEditing,
      onStartEditing: startEditing,
      onToggle,
    }),
    [
      cancelEditing,
      editDraft,
      editingItemId,
      identity,
      isSaving,
      onRemove,
      onToggle,
      saveEditing,
      startEditing,
      updateDraft,
    ],
  );
  const table = useTable({
    features: shoppingTableFeatures,
    data: items,
    columns,
    getRowId: (row) => row.id,
    meta: tableMeta,
  });
  const mobileTable = useTable({
    features: shoppingTableFeatures,
    data: items,
    columns: mobileColumns,
    getRowId: (row) => row.id,
    meta: tableMeta,
  });

  return (
    <>
      <MobileShoppingTable
        editDraft={editDraft}
        editingItemId={editingItemId}
        isSaving={isSaving}
        newItem={newItem}
        emptyMessage={emptyMessage}
        table={mobileTable}
        onCancelEditing={cancelEditing}
        onAdd={onAdd}
        onEditDraftChange={updateDraft}
        onNewItemChange={onNewItemChange}
        onSaveEditing={saveEditing}
        onNewItemKeyDown={submitNewItemOnEnter}
      />
      <div className="hidden w-full overflow-x-auto md:block">
        <table className="w-full min-w-190 border-collapse">
          <colgroup>
            <col className="w-24" />
            <col className="w-10" />
            <col />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-28" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-24" />
            <col className="w-12" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="invoice-rule border-b-2">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-10 bg-muted/50 px-3 text-left align-middle text-[13px] font-semibold tracking-widest text-muted-foreground uppercase first:pl-4"
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="group border-b border-border/80 transition-colors hover:bg-muted/40"
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </tr>
              ))
            ) : emptyMessage ? (
              <tr>
                <TableCell
                  className="px-4 py-12 text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </TableCell>
              </tr>
            ) : null}
            <DesktopNewItemRow
              newItem={newItem}
              onAdd={onAdd}
              onKeyDown={submitNewItemOnEnter}
              onChange={onNewItemChange}
            />
          </tbody>
        </table>
      </div>
    </>
  );
}

function DesktopNewItemRow({
  newItem,
  onAdd,
  onChange,
  onKeyDown,
}: {
  newItem: NewItemDraft;
  onAdd: () => void;
  onChange: (field: keyof NewItemDraft, value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <tr className="border-b-2 border-primary/20 bg-primary/5">
      <TableCell className="px-4 py-3">
        <span className="font-mono text-[11px] font-semibold text-primary">+</span>
      </TableCell>
      <TableCell className="px-3 py-3">
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
          new
        </span>
      </TableCell>
      <TableCell className="px-3 py-3">
        <Input
          aria-label="New item name"
          className="h-9 min-w-32 font-serif text-base sm:text-xs"
          maxLength={200}
          onChange={(event) => onChange("name", event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Item"
          value={newItem.name}
        />
      </TableCell>
      <TableCell className="px-3 py-3">
        <Input
          aria-label="New item quantity"
          className="h-9 w-16 text-right font-mono text-base sm:text-xs"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => onChange("quantity", event.target.value)}
          onKeyDown={onKeyDown}
          value={newItem.quantity}
        />
      </TableCell>
      <TableCell className="px-3 py-3">
        <Input
          aria-label="New item unit"
          className="h-9 w-20 font-serif text-base sm:text-xs"
          maxLength={32}
          onChange={(event) => onChange("unit", event.target.value)}
          onKeyDown={onKeyDown}
          value={newItem.unit}
        />
      </TableCell>
      <TableCell className="px-3 py-3">
        <Input
          aria-label="New item amount each"
          className="h-9 w-28 font-serif text-base sm:text-xs"
          maxLength={64}
          onChange={(event) => onChange("amount", event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Each"
          value={newItem.amount}
        />
      </TableCell>
      <TableCell className="px-3 py-3">
        <Input
          aria-label="New item category"
          className="h-9 w-28 font-serif text-base sm:text-[10px]"
          maxLength={64}
          onChange={(event) => onChange("category", event.target.value)}
          onKeyDown={onKeyDown}
          value={newItem.category}
        />
      </TableCell>
      <TableCell className="px-3 py-3">
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
          draft
        </span>
      </TableCell>
      <TableCell className="px-3 py-3">
        <span className="font-mono text-[10px] tracking-[0.08em] text-primary uppercase">open</span>
      </TableCell>
      <TableCell className="px-3 py-3">
        <Button aria-label="Add item" onPress={onAdd} size="icon-sm">
          <Plus />
        </Button>
      </TableCell>
    </tr>
  );
}

function MobileShoppingTable({
  emptyMessage,
  editDraft,
  editingItemId,
  isSaving,
  newItem,
  table,
  onCancelEditing,
  onAdd,
  onEditDraftChange,
  onNewItemChange,
  onNewItemKeyDown,
  onSaveEditing,
}: {
  emptyMessage?: string;
  editDraft?: ItemEditDraft;
  editingItemId?: string;
  isSaving: boolean;
  newItem: NewItemDraft;
  table: ShoppingTableInstance;
  onCancelEditing: () => void;
  onAdd: () => void;
  onEditDraftChange: (field: keyof ItemEditDraft, value: string) => void;
  onNewItemChange: (field: keyof NewItemDraft, value: string) => void;
  onNewItemKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSaveEditing: () => void;
}) {
  const rows = table.getRowModel().rows;

  return (
    <div className="md:hidden">
      <table className="w-full border-collapse">
        <caption className="sr-only">Shopping list items</caption>
        <thead className="sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={`h-8 bg-muted/50 px-2 text-left font-mono text-[10px] tracking-widest text-muted-foreground uppercase first:pl-3 last:pr-3 ${header.column.id === "done" ? "w-12" : header.column.id === "actions" ? "w-20 text-right" : ""}`}
                  scope="col"
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length > 0 ? (
            rows.map((row) => {
              if (editingItemId === row.original.id) {
                return (
                  <tr key={row.id}>
                    <TableCell className="px-4 py-3" colSpan={row.getAllCells().length}>
                      <form
                        className="grid grid-cols-6 gap-x-2 gap-y-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          onSaveEditing();
                        }}
                      >
                        <label
                          className="col-span-6 flex min-w-0 flex-col gap-1"
                          htmlFor={`mobile-edit-name-${row.original.id}`}
                        >
                          <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                            item
                          </span>
                          <Input
                            id={`mobile-edit-name-${row.original.id}`}
                            aria-label={`Edit ${row.original.name} name`}
                            className="h-9 min-w-0 font-serif text-base"
                            maxLength={200}
                            onChange={(event) => onEditDraftChange("name", event.target.value)}
                            value={editDraft?.name ?? row.original.name}
                          />
                        </label>
                        <label
                          className="col-span-2 flex min-w-0 flex-col gap-1"
                          htmlFor={`mobile-edit-quantity-${row.original.id}`}
                        >
                          <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                            qty
                          </span>
                          <Input
                            id={`mobile-edit-quantity-${row.original.id}`}
                            aria-label={`Edit ${row.original.name} quantity`}
                            className="h-9 min-w-0 text-right font-mono text-base"
                            inputMode="numeric"
                            maxLength={6}
                            onChange={(event) => onEditDraftChange("quantity", event.target.value)}
                            value={editDraft?.quantity ?? String(row.original.quantity)}
                          />
                        </label>
                        <label
                          className="col-span-2 flex min-w-0 flex-col gap-1"
                          htmlFor={`mobile-edit-unit-${row.original.id}`}
                        >
                          <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                            unit
                          </span>
                          <Input
                            id={`mobile-edit-unit-${row.original.id}`}
                            aria-label={`Edit ${row.original.name} unit`}
                            className="h-9 min-w-0 font-serif text-base"
                            maxLength={32}
                            onChange={(event) => onEditDraftChange("unit", event.target.value)}
                            value={editDraft?.unit ?? row.original.unit}
                          />
                        </label>
                        <label
                          className="col-span-2 flex min-w-0 flex-col gap-1"
                          htmlFor={`mobile-edit-amount-${row.original.id}`}
                        >
                          <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                            amount each
                          </span>
                          <Input
                            id={`mobile-edit-amount-${row.original.id}`}
                            aria-label={`Edit ${row.original.name} amount each`}
                            className="h-9 min-w-0 font-serif text-base"
                            maxLength={64}
                            onChange={(event) => onEditDraftChange("amount", event.target.value)}
                            placeholder="Optional"
                            value={editDraft?.amount ?? row.original.amount}
                          />
                        </label>
                        <label
                          className="col-span-6 flex min-w-0 flex-col gap-1"
                          htmlFor={`mobile-edit-category-${row.original.id}`}
                        >
                          <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                            category
                          </span>
                          <Input
                            id={`mobile-edit-category-${row.original.id}`}
                            aria-label={`Edit ${row.original.name} category`}
                            className="h-9 min-w-0 font-serif text-base"
                            maxLength={64}
                            onChange={(event) => onEditDraftChange("category", event.target.value)}
                            value={editDraft?.category ?? row.original.category}
                          />
                        </label>
                        <div className="col-span-6 flex justify-end gap-2 pt-1">
                          <Button
                            aria-label={isSaving ? "Saving" : `Save changes to ${row.original.name}`}
                            className="size-11"
                            isDisabled={isSaving}
                            type="submit"
                          >
                            <Save />
                          </Button>
                          <Button
                            aria-label={`Cancel editing ${row.original.name}`}
                            className="size-11"
                            isDisabled={isSaving}
                            onPress={onCancelEditing}
                            type="button"
                            variant="ghost"
                          >
                            <X />
                          </Button>
                        </div>
                      </form>
                    </TableCell>
                  </tr>
                );
              }

              return (
                <tr key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      className={
                        cell.column.id === "done"
                          ? "w-12 px-1"
                          : cell.column.id === "actions"
                            ? "w-24 px-1"
                            : "min-w-0 px-1"
                      }
                      key={cell.id}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </tr>
              );
            })
          ) : emptyMessage ? (
            <tr>
              <TableCell
                className="px-4 py-8 text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
                colSpan={3}
              >
                {emptyMessage}
              </TableCell>
            </tr>
          ) : null}
          <MobileNewItemRow
            newItem={newItem}
            onAdd={onAdd}
            onChange={onNewItemChange}
            onKeyDown={onNewItemKeyDown}
          />
        </tbody>
      </table>
    </div>
  );
}

function MobileNewItemRow({
  newItem,
  onAdd,
  onChange,
  onKeyDown,
}: {
  newItem: NewItemDraft;
  onAdd: () => void;
  onChange: (field: keyof NewItemDraft, value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <tr className="border-b-2 border-primary/20 bg-primary/5 align-top">
      <TableCell className="w-12 px-1 py-3 text-center">
        <span className="font-mono text-[10px] font-semibold tracking-[0.08em] text-primary uppercase">
          new
        </span>
      </TableCell>
      <TableCell className="min-w-0 px-2 py-3">
        <div className="grid grid-cols-6 gap-x-2 gap-y-2">
          <label className="col-span-6 flex min-w-0 flex-col gap-1" htmlFor="new-item-mobile">
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
              item
            </span>
            <Input
              id="new-item-mobile"
              aria-label="New item name"
              className="h-9 font-serif text-base"
              maxLength={200}
              onChange={(event) => onChange("name", event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="New item"
              value={newItem.name}
            />
          </label>
          <label className="col-span-2 flex min-w-0 flex-col gap-1" htmlFor="new-quantity-mobile">
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
              qty
            </span>
            <Input
              id="new-quantity-mobile"
              aria-label="New item quantity"
              className="h-9 text-right font-mono text-base"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => onChange("quantity", event.target.value)}
              onKeyDown={onKeyDown}
              value={newItem.quantity}
            />
          </label>
          <label className="col-span-2 flex min-w-0 flex-col gap-1" htmlFor="new-unit-mobile">
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
              unit
            </span>
            <Input
              id="new-unit-mobile"
              aria-label="New item unit"
              className="h-9 font-serif text-base"
              maxLength={32}
              onChange={(event) => onChange("unit", event.target.value)}
              onKeyDown={onKeyDown}
              value={newItem.unit}
            />
          </label>
          <label className="col-span-2 flex min-w-0 flex-col gap-1" htmlFor="new-amount-mobile">
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
              amount each
            </span>
            <Input
              id="new-amount-mobile"
              aria-label="New item amount each"
              className="h-9 font-serif text-base"
              maxLength={64}
              onChange={(event) => onChange("amount", event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Optional"
              value={newItem.amount}
            />
          </label>
          <label className="col-span-6 flex min-w-0 flex-col gap-1" htmlFor="new-category-mobile">
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
              category
            </span>
            <Input
              id="new-category-mobile"
              aria-label="New item category"
              className="h-9 font-serif text-base"
              maxLength={64}
              onChange={(event) => onChange("category", event.target.value)}
              onKeyDown={onKeyDown}
              value={newItem.category}
            />
          </label>
        </div>
      </TableCell>
      <TableCell className="w-20 px-1 py-3 text-right align-top">
        <Button aria-label="Add item" className="size-9" onPress={onAdd} size="icon">
          <Plus />
        </Button>
      </TableCell>
    </tr>
  );
}

function DeletedItemsHistory({
  busyArchiveId,
  identity,
  items,
  onPurge,
  onRestore,
}: {
  busyArchiveId?: string;
  identity?: LocalIdentity;
  items: DeletedListItem[];
  onPurge: (archiveId: string) => void;
  onRestore: (archiveId: string) => void;
}) {
  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string>();

  if (items.length === 0) {
    return null;
  }

  const historyItems = items.reduceRight<DeletedListItem[]>((reversed, item) => {
    reversed.push(item);
    return reversed;
  }, []);

  return (
    <section className="invoice-rule border-t border-destructive/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            Item history
          </p>
          <h2 className="mt-1 text-xl leading-none font-semibold tracking-tight uppercase">
            Deleted items
          </h2>
        </div>
      </div>
      <div className="divide-y divide-border">
        {historyItems.map((item) => {
          const isBusy = busyArchiveId === item.archiveId;
          return (
            <div
              className="flex flex-wrap items-center justify-between gap-3 py-4"
              key={item.archiveId}
            >
              <div className="min-w-0">
                <p className="truncate font-serif text-sm font-medium">{item.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
                  <ItemMeasure item={item} />
                  <span aria-hidden="true">·</span>
                  <span className="font-serif">{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase">Deleted</span>
                  <span>{item.deletedAt.slice(0, 10)}</span>
                  {item.deletedBy ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase">Deleted by</span>
                      <span className="font-serif">
                        {identityDisplayName(item.deletedBy, identity)}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              {confirmingArchiveId === item.archiveId ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    aria-label={`Delete ${item.name} forever`}
                    isDisabled={isBusy}
                    onPress={() => {
                      setConfirmingArchiveId(undefined);
                      onPurge(item.archiveId);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    Delete forever
                  </Button>
                  <Button
                    isDisabled={isBusy}
                    onPress={() => setConfirmingArchiveId(undefined)}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    aria-label={`Restore ${item.name}`}
                    isDisabled={isBusy}
                    onPress={() => onRestore(item.archiveId)}
                    size="sm"
                    variant="outline"
                  >
                    <RotateCcw />
                    Restore
                  </Button>
                  <Button
                    aria-label={`Delete ${item.name} forever`}
                    isDisabled={isBusy}
                    onPress={() => setConfirmingArchiveId(item.archiveId)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 />
                    Delete forever
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getShoppingTableMeta(table: { options: { meta?: ShoppingTableMeta } }): ShoppingTableMeta {
  if (!table.options.meta) {
    throw new Error("Shopping table metadata is missing");
  }
  return table.options.meta;
}

function createShoppingColumns() {
  return shoppingColumnHelper.columns([
    shoppingColumnHelper.display({
      id: "line",
      header: "no.",
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {String(row.index + 1).padStart(2, "0")}
        </span>
      ),
    }),
    shoppingColumnHelper.display({
      id: "done",
      header: "",
      cell: ({ row, table }) => {
        const { onToggle } = getShoppingTableMeta(table);
        return (
          <Checkbox
            aria-label={`Mark ${row.original.name} as ${row.original.checked ? "open" : "done"}`}
            isSelected={row.original.checked}
            onChange={(checked) => onToggle(row.original.id, checked)}
          />
        );
      },
    }),
    shoppingColumnHelper.accessor("name", {
      id: "item",
      header: "item",
      cell: ({ getValue, row, table }) => {
        const { editDraft, editingItemId, onEditDraftChange } = getShoppingTableMeta(table);
        if (editingItemId === row.original.id) {
          return (
            <Input
              aria-label={`Edit ${row.original.name} name`}
              className="min-w-32 font-serif"
              maxLength={200}
              onChange={(event) => onEditDraftChange("name", event.target.value)}
              value={editDraft?.name ?? getValue()}
            />
          );
        }

        return (
          <span
            className={
              row.original.checked ? "font-serif text-muted-foreground line-through" : "font-serif"
            }
          >
            {getValue()}
          </span>
        );
      },
    }),
    shoppingColumnHelper.accessor("quantity", {
      header: "qty",
      cell: ({ getValue, row, table }) => {
        const { editDraft, editingItemId, onEditDraftChange } = getShoppingTableMeta(table);
        if (editingItemId === row.original.id) {
          return (
            <Input
              aria-label={`Edit ${row.original.name} quantity`}
              className="w-16 text-right font-mono"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => onEditDraftChange("quantity", event.target.value)}
              value={editDraft?.quantity ?? String(getValue())}
            />
          );
        }

        return <span className="block text-right font-mono text-[12px]">{getValue()}</span>;
      },
    }),
    shoppingColumnHelper.accessor("unit", {
      header: "unit",
      cell: ({ getValue, row, table }) => {
        const { editDraft, editingItemId, onEditDraftChange } = getShoppingTableMeta(table);
        if (editingItemId === row.original.id) {
          return (
            <Input
              aria-label={`Edit ${row.original.name} unit`}
              className="w-20 font-serif text-[11px]"
              maxLength={32}
              onChange={(event) => onEditDraftChange("unit", event.target.value)}
              value={editDraft?.unit ?? getValue()}
            />
          );
        }

        return <span className="font-serif text-[11px]">{getValue()}</span>;
      },
    }),
    shoppingColumnHelper.accessor("amount", {
      header: "amount",
      cell: ({ getValue, row, table }) => {
        const { editDraft, editingItemId, onEditDraftChange } = getShoppingTableMeta(table);
        if (editingItemId === row.original.id) {
          return (
            <Input
              aria-label={`Edit ${row.original.name} amount each`}
              className="w-28 font-serif text-[11px]"
              maxLength={64}
              onChange={(event) => onEditDraftChange("amount", event.target.value)}
              placeholder="optional"
              value={editDraft?.amount ?? getValue()}
            />
          );
        }

        return <span className="font-serif text-[11px]">{getValue() || "—"}</span>;
      },
    }),
    shoppingColumnHelper.accessor("category", {
      header: "category",
      cell: ({ getValue, row, table }) => {
        const { editDraft, editingItemId, onEditDraftChange } = getShoppingTableMeta(table);
        if (editingItemId === row.original.id) {
          return (
            <Input
              aria-label={`Edit ${row.original.name} category`}
              className="w-28 font-serif text-[10px]"
              maxLength={64}
              onChange={(event) => onEditDraftChange("category", event.target.value)}
              value={editDraft?.category ?? getValue()}
            />
          );
        }

        return <span className="font-serif text-[10px] text-muted-foreground">{getValue()}</span>;
      },
    }),
    shoppingColumnHelper.display({
      id: "signed",
      header: "signed",
      cell: ({ row, table }) => {
        const { identity } = getShoppingTableMeta(table);
        return <SignedItemBadge identity={identity} item={row.original} />;
      },
    }),
    shoppingColumnHelper.display({
      id: "status",
      header: "status",
      cell: ({ row }) => (
        <span
          className={
            row.original.checked
              ? "font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase"
              : "font-mono text-[10px] tracking-[0.08em] text-primary uppercase"
          }
        >
          {row.original.checked ? "done" : "open"}
        </span>
      ),
    }),
    shoppingColumnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row, table }) => {
        const {
          editingItemId,
          isSaving,
          onCancelEditing,
          onRemove,
          onSaveEditing,
          onStartEditing,
        } = getShoppingTableMeta(table);
        return editingItemId === row.original.id ? (
          <div className="flex items-center gap-1">
            <Button
              aria-label={`Save changes to ${row.original.name}`}
              isDisabled={isSaving}
              onPress={onSaveEditing}
              size="icon-sm"
            >
              <Check />
            </Button>
            <Button
              aria-label={`Cancel editing ${row.original.name}`}
              isDisabled={isSaving}
              onPress={onCancelEditing}
              size="icon-sm"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              aria-label={`Edit ${row.original.name}`}
              className="size-7 px-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              isDisabled={isSaving}
              onPress={() => onStartEditing(row.original)}
              variant="ghost"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              aria-label={`Remove ${row.original.name}`}
              className="size-7 px-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              isDisabled={isSaving}
              onPress={() => onRemove(row.original.id)}
              variant="ghost"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        );
      },
    }),
  ]);
}

function createMobileShoppingColumns({
  identity,
  isSaving,
  onRemove,
  onStartEditing,
  onToggle,
}: {
  identity?: LocalIdentity;
  isSaving: boolean;
  onRemove: (id: string) => void;
  onStartEditing: (item: ListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return shoppingColumnHelper.columns([
    shoppingColumnHelper.display({
      id: "done",
      header: "done",
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Mark ${row.original.name} as ${row.original.checked ? "open" : "done"}`}
          className="size-11 shrink-0 justify-center rounded-md"
          isSelected={row.original.checked}
          onChange={(checked) => onToggle(row.original.id, checked)}
        />
      ),
    }),
    shoppingColumnHelper.display({
      id: "item",
      header: "item details",
      cell: ({ row }) => (
        <div className="min-w-0 py-1">
          <p
            className={
              row.original.checked
                ? "truncate font-serif font-medium text-muted-foreground line-through"
                : "truncate font-serif font-medium"
            }
          >
            {row.original.name}
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] tracking-[0.08em] text-muted-foreground">
            <ItemMeasure item={row.original} />
            <span aria-hidden="true" className="font-mono">
              ·
            </span>
            <span className="font-serif">{row.original.category}</span>
            <span aria-hidden="true" className="font-mono">
              ·
            </span>
            <span className="font-mono uppercase">{row.original.checked ? "done" : "open"}</span>
            <SignedItemBadge identity={identity} item={row.original} />
          </div>
        </div>
      ),
    }),
    shoppingColumnHelper.display({
      id: "actions",
      header: "actions",
      cell: ({ row }) => (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            aria-label={`Edit ${row.original.name}`}
            className="size-11 p-0"
            isDisabled={isSaving}
            onPress={() => onStartEditing(row.original)}
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            aria-label={`Remove ${row.original.name}`}
            className="size-11 p-0"
            isDisabled={isSaving}
            onPress={() => onRemove(row.original.id)}
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    }),
  ]);
}
