import type { DeletedListItem, ListCommand, ListItem, ListSnapshot } from "@jfa.dev/common/lists";
import { Button, Checkbox, Input, TableCell } from "@jfa.dev/common/ui";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Check, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { v7 as uuidv7 } from "uuid";

import { KewekeHeader } from "@/components/keweke-header";
import { isListAddress } from "@/lib/list-id";
import {
  applyMutation,
  assignListAlias,
  createMutation,
  loadList,
  migrateList,
} from "@/lib/list-repository";

const shoppingTableFeatures = tableFeatures({});
const shoppingColumnHelper = createColumnHelper<typeof shoppingTableFeatures, ListItem>();
const EMPTY_ITEMS: ListItem[] = [];

type ItemEditDraft = {
  name: string;
  quantity: string;
  unit: string;
  category: string;
};

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
  const [isAssigningAlias, setIsAssigningAlias] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [busyArchiveId, setBusyArchiveId] = useState<string>();
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState("");
  const [draftItem, setDraftItem] = useState("");
  const [draftQuantity, setDraftQuantity] = useState("1");

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

  const commit = useCallback(
    async (command: ListCommand): Promise<boolean> => {
      if (!loadedList) {
        return false;
      }

      const result = await applyMutation(
        loadedList.snapshot.id,
        loadedList.backend,
        createMutation(loadedList.snapshot, command),
      );
      if (result.status === "missing") {
        setError("This list no longer exists.");
        return false;
      }
      if (result.status === "conflict") {
        setLoadedList({ backend: loadedList.backend, snapshot: result.snapshot });
        setError("This list changed elsewhere. Your view was refreshed.");
        return false;
      }

      setLoadedList({ backend: loadedList.backend, snapshot: result.snapshot });
      setError(undefined);
      return true;
    },
    [loadedList],
  );

  const migrate = useCallback(async (): Promise<void> => {
    if (!loadedList || loadedList.backend !== "local") {
      return;
    }

    setIsMigrating(true);
    try {
      const result = await migrateList(loadedList.snapshot);
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
    } catch {
      setError("Remote migration is not available right now.");
    } finally {
      setIsMigrating(false);
    }
  }, [loadedList]);

  const assignAlias = useCallback(
    async (aliasBase: string): Promise<void> => {
      if (!loadedList) {
        return;
      }

      setIsAssigningAlias(true);
      try {
        const result = await assignListAlias(loadedList.backend, loadedList.snapshot, aliasBase);
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
      } finally {
        setIsAssigningAlias(false);
      }
    },
    [loadedList, navigate],
  );

  const renameList = useCallback(
    async (title: string): Promise<boolean> => {
      setIsRenaming(true);
      try {
        return await commit({ type: "rename-list", title });
      } catch {
        setError("Could not save the list title right now.");
        return false;
      } finally {
        setIsRenaming(false);
      }
    },
    [commit],
  );

  const updateItem = useCallback(
    async (itemId: string, draft: ItemEditDraft): Promise<boolean> => {
      const name = draft.name.trim();
      const quantity = Number(draft.quantity);
      const unit = draft.unit.trim();
      const category = draft.category.trim();
      if (!name || !Number.isInteger(quantity) || quantity < 1 || !unit || !category) {
        setError("Enter a name, whole quantity, unit, and category.");
        return false;
      }

      try {
        return await commit({
          type: "update-item",
          itemId,
          changes: { name, quantity, unit, category },
        });
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

  const addItem = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const name = draftItem.trim();
      const quantity = Number.parseInt(draftQuantity, 10);
      if (!name || !Number.isFinite(quantity) || quantity < 1) {
        return;
      }

      void commit({
        type: "add-item",
        item: {
          id: uuidv7(),
          name,
          quantity,
          unit: "EA",
          category: "GENERAL",
        },
      }).then((committed) => {
        if (committed) {
          setDraftItem("");
          setDraftQuantity("1");
        }
        return committed;
      });
    },
    [commit, draftItem, draftQuantity],
  );

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
      [item.name, item.category, item.unit].some((value) =>
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
              <h1 className="mt-3 text-4xl leading-[0.95] font-semibold tracking-[-0.05em] uppercase sm:text-6xl">
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
        onMigrate={migrate}
      />
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="invoice-rule flex flex-col gap-5 border-b px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
          <div>
            <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {loadedList.backend} list
            </p>
            <ListTitleEditor isSaving={isRenaming} onSave={renameList} title={snapshot.title} />
            <ListAliasEditor
              alias={snapshot.alias ?? null}
              isSaving={isAssigningAlias}
              onSave={assignAlias}
            />
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
              className="w-full max-w-none pl-10 font-mono text-base sm:text-[11px]"
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search items"
              value={filter}
            />
          </div>
        </div>
        <div className="invoice-rule border-b px-4 py-3 sm:px-6 lg:px-8">
          <form
            aria-label="Add an item"
            className="flex w-full flex-wrap gap-1.5 sm:justify-end"
            onSubmit={addItem}
          >
            <label className="sr-only" htmlFor="new-item">
              New item
            </label>
            <Input
              id="new-item"
              aria-label="New item"
              className="min-w-44 flex-1 text-base sm:w-56 sm:flex-none sm:text-sm"
              onChange={(event) => setDraftItem(event.target.value)}
              placeholder="New item"
              value={draftItem}
            />
            <label className="sr-only" htmlFor="new-quantity">
              Quantity
            </label>
            <Input
              id="new-quantity"
              aria-label="Quantity"
              className="w-16 text-right font-mono text-base sm:text-sm"
              inputMode="numeric"
              onChange={(event) => setDraftQuantity(event.target.value)}
              value={draftQuantity}
            />
            <Button
              aria-label="Add item"
              className="size-11 p-0 text-base sm:h-7 sm:w-auto sm:min-w-0 sm:px-2 sm:text-xs"
              type="submit"
            >
              <Plus className="h-5 w-5 sm:size-3.5" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </form>
        </div>

        <ShoppingTable
          items={visibleItems}
          onRemove={removeItem}
          onToggle={toggleItem}
          onUpdate={updateItem}
        />
        <DeletedItemsHistory
          busyArchiveId={busyArchiveId}
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
        <h1 className="text-xl leading-none font-semibold tracking-tight uppercase sm:text-2xl">
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
        className="min-w-44 flex-1 font-serif text-lg font-semibold uppercase"
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

function ListAliasEditor({
  alias,
  isSaving,
  onSave,
}: {
  alias: string | null;
  isSaving: boolean;
  onSave: (aliasBase: string) => void;
}) {
  const [value, setValue] = useState("");

  if (alias !== null) {
    return (
      <p className="mt-2 font-mono text-[10px] tracking-[0.08em] text-primary uppercase">
        friendly address / {alias}
      </p>
    );
  }

  return (
    <form
      className="mt-3 flex max-w-md flex-wrap items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        const aliasBase = value.trim();
        if (aliasBase) {
          onSave(aliasBase);
        }
      }}
    >
      <label className="sr-only" htmlFor="list-alias">
        Friendly list address
      </label>
      <Input
        id="list-alias"
        aria-label="Friendly list address"
        className="min-w-44 flex-1 font-mono text-base sm:text-[11px]"
        onChange={(event) => setValue(event.target.value)}
        placeholder="Name this list for sharing"
        value={value}
      />
      <Button isDisabled={isSaving} type="submit" variant="outline">
        {isSaving ? "Saving" : "Make address"}
      </Button>
    </form>
  );
}

function ShoppingTable({
  items,
  onRemove,
  onToggle,
  onUpdate,
}: {
  items: ListItem[];
  onRemove: (id: string) => void;
  onToggle: (id: string, checked: boolean) => void;
  onUpdate: (itemId: string, draft: ItemEditDraft) => Promise<boolean>;
}) {
  const [editingItemId, setEditingItemId] = useState<string>();
  const [editDraft, setEditDraft] = useState<ItemEditDraft>();
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = useCallback((item: ListItem): void => {
    setEditingItemId(item.id);
    setEditDraft({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
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

  const columns = useMemo(
    () =>
      createShoppingColumns({
        editDraft,
        editingItemId,
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
  });

  return (
    <>
      <MobileShoppingList
        editDraft={editDraft}
        editingItemId={editingItemId}
        isSaving={isSaving}
        items={items}
        onCancelEditing={cancelEditing}
        onEditDraftChange={updateDraft}
        onRemove={onRemove}
        onSaveEditing={saveEditing}
        onStartEditing={startEditing}
        onToggle={onToggle}
      />
      <div className="hidden w-full overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse">
          <colgroup>
            <col className="w-24" />
            <col className="w-10" />
            <col />
            <col className="w-20" />
            <col className="w-20" />
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
            ) : (
              <tr>
                <TableCell
                  className="px-4 py-12 text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
                  colSpan={columns.length}
                >
                  no matching lines
                </TableCell>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MobileShoppingList({
  editDraft,
  editingItemId,
  isSaving,
  items,
  onCancelEditing,
  onEditDraftChange,
  onRemove,
  onSaveEditing,
  onStartEditing,
  onToggle,
}: {
  editDraft?: ItemEditDraft;
  editingItemId?: string;
  isSaving: boolean;
  items: ListItem[];
  onCancelEditing: () => void;
  onEditDraftChange: (field: keyof ItemEditDraft, value: string) => void;
  onRemove: (id: string) => void;
  onSaveEditing: () => void;
  onStartEditing: (item: ListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-12 text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase md:hidden">
        no matching lines
      </p>
    );
  }

  return (
    <div className="divide-y divide-border md:hidden">
      {items.map((item) => {
        if (editingItemId === item.id) {
          return (
            <form
              className="grid grid-cols-2 gap-2 px-4 py-3"
              key={item.id}
              onSubmit={(event) => {
                event.preventDefault();
                onSaveEditing();
              }}
            >
              <label className="sr-only" htmlFor={`mobile-edit-name-${item.id}`}>
                Edit {item.name} name
              </label>
              <Input
                id={`mobile-edit-name-${item.id}`}
                aria-label={`Edit ${item.name} name`}
                className="col-span-2 min-w-0"
                maxLength={200}
                onChange={(event) => onEditDraftChange("name", event.target.value)}
                value={editDraft?.name ?? item.name}
              />
              <label className="sr-only" htmlFor={`mobile-edit-quantity-${item.id}`}>
                Edit {item.name} quantity
              </label>
              <Input
                id={`mobile-edit-quantity-${item.id}`}
                aria-label={`Edit ${item.name} quantity`}
                className="min-w-0 font-mono"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => onEditDraftChange("quantity", event.target.value)}
                value={editDraft?.quantity ?? String(item.quantity)}
              />
              <label className="sr-only" htmlFor={`mobile-edit-unit-${item.id}`}>
                Edit {item.name} unit
              </label>
              <Input
                id={`mobile-edit-unit-${item.id}`}
                aria-label={`Edit ${item.name} unit`}
                className="min-w-0 font-mono"
                maxLength={32}
                onChange={(event) => onEditDraftChange("unit", event.target.value)}
                value={editDraft?.unit ?? item.unit}
              />
              <label className="sr-only" htmlFor={`mobile-edit-category-${item.id}`}>
                Edit {item.name} category
              </label>
              <Input
                id={`mobile-edit-category-${item.id}`}
                aria-label={`Edit ${item.name} category`}
                className="col-span-2 min-w-0 font-mono tracking-[0.08em]"
                maxLength={64}
                onChange={(event) => onEditDraftChange("category", event.target.value)}
                value={editDraft?.category ?? item.category}
              />
              <div className="col-span-2 flex justify-end gap-2">
                <Button className="min-w-20" isDisabled={isSaving} type="submit">
                  {isSaving ? "saving" : "save"}
                </Button>
                <Button
                  className="min-w-20"
                  isDisabled={isSaving}
                  onPress={onCancelEditing}
                  type="button"
                  variant="ghost"
                >
                  cancel
                </Button>
              </div>
            </form>
          );
        }

        return (
          <div className="flex items-center gap-2 px-4 py-2" key={item.id}>
            <Checkbox
              aria-label={`Mark ${item.name} as ${item.checked ? "open" : "done"}`}
              className="size-11 shrink-0 justify-center rounded-md"
              isSelected={item.checked}
              onChange={(checked) => onToggle(item.id, checked)}
            />
            <div className="min-w-0 flex-1 py-1">
              <p
                className={
                  item.checked
                    ? "truncate font-medium text-muted-foreground line-through"
                    : "truncate font-medium"
                }
              >
                {item.name}
              </p>
              <p className="mt-1 truncate font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                {item.quantity} {item.unit} · {item.category} · {item.checked ? "done" : "open"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                aria-label={`Edit ${item.name}`}
                className="size-11 p-0"
                isDisabled={isSaving}
                onPress={() => onStartEditing(item)}
                variant="ghost"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                aria-label={`Remove ${item.name}`}
                className="size-11 p-0"
                isDisabled={isSaving}
                onPress={() => onRemove(item.id)}
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeletedItemsHistory({
  busyArchiveId,
  items,
  onPurge,
  onRestore,
}: {
  busyArchiveId?: string;
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
    <section className="invoice-rule border-t px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            item history
          </p>
          <h2 className="mt-1 text-xl leading-none font-semibold tracking-tight uppercase">
            Deleted lines
          </h2>
        </div>
        <p className="max-w-xs text-right font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          kept forever until you delete forever
        </p>
      </div>
      <div className="divide-y divide-border">
        {historyItems.map((item) => {
          const isBusy = busyArchiveId === item.archiveId;
          return (
            <div
              className="flex flex-wrap items-center justify-between gap-3 py-3"
              key={item.archiveId}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  {item.quantity} {item.unit} · {item.category} · deleted{" "}
                  {item.deletedAt.slice(0, 10)}
                </p>
              </div>
              {confirmingArchiveId === item.archiveId ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    aria-label={`Confirm delete ${item.name} forever`}
                    isDisabled={isBusy}
                    onPress={() => {
                      setConfirmingArchiveId(undefined);
                      onPurge(item.archiveId);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    delete forever
                  </Button>
                  <Button
                    isDisabled={isBusy}
                    onPress={() => setConfirmingArchiveId(undefined)}
                    size="sm"
                    variant="ghost"
                  >
                    keep it
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
                    restore
                  </Button>
                  <Button
                    aria-label={`Delete ${item.name} forever`}
                    isDisabled={isBusy}
                    onPress={() => setConfirmingArchiveId(item.archiveId)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 />
                    delete forever
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

function createShoppingColumns({
  editDraft,
  editingItemId,
  isSaving,
  onCancelEditing,
  onEditDraftChange,
  onRemove,
  onSaveEditing,
  onStartEditing,
  onToggle,
}: {
  editDraft?: ItemEditDraft;
  editingItemId?: string;
  isSaving: boolean;
  onCancelEditing: () => void;
  onEditDraftChange: (field: keyof ItemEditDraft, value: string) => void;
  onRemove: (id: string) => void;
  onSaveEditing: () => void;
  onStartEditing: (item: ListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
}) {
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
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Mark ${row.original.name} as ${row.original.checked ? "open" : "done"}`}
          isSelected={row.original.checked}
          onChange={(checked) => onToggle(row.original.id, checked)}
        />
      ),
    }),
    shoppingColumnHelper.accessor("name", {
      id: "item",
      header: "item",
      cell: ({ getValue, row }) => {
        if (editingItemId === row.original.id) {
          return (
            <Input
              aria-label={`Edit ${row.original.name} name`}
              className="min-w-32"
              maxLength={200}
              onChange={(event) => onEditDraftChange("name", event.target.value)}
              value={editDraft?.name ?? getValue()}
            />
          );
        }

        return (
          <span className={row.original.checked ? "text-muted-foreground line-through" : undefined}>
            {getValue()}
          </span>
        );
      },
    }),
    shoppingColumnHelper.accessor("quantity", {
      header: "qty",
      cell: ({ getValue, row }) => {
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
      cell: ({ getValue, row }) => {
        if (editingItemId === row.original.id) {
          return (
            <Input
              aria-label={`Edit ${row.original.name} unit`}
              className="w-20 font-mono text-[11px]"
              maxLength={32}
              onChange={(event) => onEditDraftChange("unit", event.target.value)}
              value={editDraft?.unit ?? getValue()}
            />
          );
        }

        return <span className="font-mono text-[11px]">{getValue()}</span>;
      },
    }),
    shoppingColumnHelper.accessor("category", {
      header: "category",
      cell: ({ getValue, row }) => {
        if (editingItemId === row.original.id) {
          return (
            <Input
              aria-label={`Edit ${row.original.name} category`}
              className="w-28 font-mono text-[10px] tracking-[0.08em]"
              maxLength={64}
              onChange={(event) => onEditDraftChange("category", event.target.value)}
              value={editDraft?.category ?? getValue()}
            />
          );
        }

        return (
          <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
            {getValue()}
          </span>
        );
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
      cell: ({ row }) =>
        editingItemId === row.original.id ? (
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
        ),
    }),
  ]);
}
