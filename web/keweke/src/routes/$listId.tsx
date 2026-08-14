import type { ListCommand, ListItem, ListSnapshot } from "@jfa.dev/common/lists";
import { Button, Checkbox, Input, TableCell } from "@jfa.dev/common/ui";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { v7 as uuidv7 } from "uuid";

import { KewekeHeader } from "@/components/keweke-header";
import { isUuidV7 } from "@/lib/list-id";
import { applyMutation, createMutation, loadList, migrateList } from "@/lib/list-repository";

const shoppingTableFeatures = tableFeatures({});
const shoppingColumnHelper = createColumnHelper<typeof shoppingTableFeatures, ListItem>();
const EMPTY_ITEMS: ListItem[] = [];

export const Route = createFileRoute("/$listId")({
  beforeLoad: ({ params }) => {
    if (!isUuidV7(params.listId)) {
      throw notFound();
    }
  },
  component: ListPage,
});

function ListPage() {
  const { listId } = Route.useParams();
  const [loadedList, setLoadedList] = useState<
    { backend: "local" | "remote"; snapshot: ListSnapshot } | undefined
  >();
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
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
        listId,
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
    [listId, loadedList],
  );

  const migrate = useCallback(async (): Promise<void> => {
    if (!loadedList || loadedList.backend !== "local") {
      return;
    }

    setIsMigrating(true);
    try {
      const result = await migrateList(listId, loadedList.snapshot);
      if (result.status === "conflict") {
        setError("A remote list already exists for this identifier.");
        return;
      }

      setLoadedList({ backend: "remote", snapshot: result.snapshot });
      setError(undefined);
    } catch {
      setError("Remote migration is not available right now.");
    } finally {
      setIsMigrating(false);
    }
  }, [listId, loadedList]);

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
        <main className="min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
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
        <main className="min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
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
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="invoice-rule flex flex-wrap items-end justify-between gap-4 border-b px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {loadedList.backend} list
            </p>
            <h1 className="mt-1 text-xl leading-none font-semibold tracking-tight uppercase sm:text-2xl">
              {snapshot.title}
            </h1>
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

        <div className="invoice-rule flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 lg:px-8">
          <Input
            id="filter-items"
            aria-label="Filter list items"
            className="max-w-xs font-mono text-[11px]"
            onChange={(event) => setFilter(event.target.value)}
            placeholder="filter items"
            value={filter}
          />
          <form className="flex w-full flex-wrap gap-1.5 sm:w-auto" onSubmit={addItem}>
            <label className="sr-only" htmlFor="new-item">
              New item
            </label>
            <Input
              id="new-item"
              aria-label="New item"
              className="min-w-44 flex-1 sm:w-56 sm:flex-none"
              onChange={(event) => setDraftItem(event.target.value)}
              placeholder="new item"
              value={draftItem}
            />
            <label className="sr-only" htmlFor="new-quantity">
              Quantity
            </label>
            <Input
              id="new-quantity"
              aria-label="Quantity"
              className="w-16 text-right font-mono"
              inputMode="numeric"
              onChange={(event) => setDraftQuantity(event.target.value)}
              value={draftQuantity}
            />
            <Button type="submit">
              <Plus className="size-3.5" />
              add
            </Button>
          </form>
        </div>

        <ShoppingTable items={visibleItems} onRemove={removeItem} onToggle={toggleItem} />
      </main>
    </div>
  );
}

function ShoppingTable({
  items,
  onRemove,
  onToggle,
}: {
  items: ListItem[];
  onRemove: (id: string) => void;
  onToggle: (id: string, checked: boolean) => void;
}) {
  const columns = useMemo(() => createShoppingColumns(onRemove, onToggle), [onRemove, onToggle]);
  const table = useTable({
    features: shoppingTableFeatures,
    data: items,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <colgroup>
          <col className="w-12" />
          <col className="w-10" />
          <col />
          <col className="w-20" />
          <col className="w-20" />
          <col className="w-32" />
          <col className="w-24" />
          <col className="w-12" />
        </colgroup>
        <thead>
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
  );
}

function createShoppingColumns(
  onRemove: (id: string) => void,
  onToggle: (id: string, checked: boolean) => void,
) {
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
      cell: ({ getValue, row }) => (
        <span className={row.original.checked ? "text-muted-foreground line-through" : undefined}>
          {getValue()}
        </span>
      ),
    }),
    shoppingColumnHelper.accessor("quantity", {
      header: "qty",
      cell: ({ getValue }) => (
        <span className="block text-right font-mono text-[12px]">{getValue()}</span>
      ),
    }),
    shoppingColumnHelper.accessor("unit", {
      header: "unit",
      cell: ({ getValue }) => <span className="font-mono text-[11px]">{getValue()}</span>,
    }),
    shoppingColumnHelper.accessor("category", {
      header: "category",
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
          {getValue()}
        </span>
      ),
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
      cell: ({ row }) => (
        <Button
          aria-label={`Remove ${row.original.name}`}
          className="size-7 px-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onPress={() => onRemove(row.original.id)}
          variant="ghost"
        >
          <Trash2 className="size-3.5" />
        </Button>
      ),
    }),
  ]);
}
