import { Button, Checkbox, Input, TableCell } from "@jfa.dev/common/ui";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent } from "react";

import { KewekeHeader } from "@/components/keweke-header";
import { isUuidV7 } from "@/lib/list-id";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
}

const starterItems: ShoppingItem[] = [
  {
    id: "starter-bread",
    name: "Bread",
    quantity: 1,
    unit: "EA",
    category: "BAKERY",
    checked: false,
  },
  {
    id: "starter-tomatoes",
    name: "Tomatoes",
    quantity: 6,
    unit: "EA",
    category: "PRODUCE",
    checked: false,
  },
  {
    id: "starter-coffee",
    name: "Coffee",
    quantity: 1,
    unit: "BAG",
    category: "PANTRY",
    checked: true,
  },
];

const shoppingTableFeatures = tableFeatures({});
const shoppingColumnHelper = createColumnHelper<typeof shoppingTableFeatures, ShoppingItem>();

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
  const [items, setItems] = useState<ShoppingItem[]>(() => starterItems);
  const [filter, setFilter] = useState("");
  const [draftItem, setDraftItem] = useState("");
  const [draftQuantity, setDraftQuantity] = useState("1");
  const activeCount = items.filter((item) => !item.checked).length;
  const completedCount = items.length - activeCount;

  const addItem = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const name = draftItem.trim();
      const quantity = Number.parseInt(draftQuantity, 10);
      if (!name || !Number.isFinite(quantity) || quantity < 1) {
        return;
      }

      setItems((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name,
          quantity,
          unit: "EA",
          category: "GENERAL",
          checked: false,
        },
      ]);
      setDraftItem("");
      setDraftQuantity("1");
    },
    [draftItem, draftQuantity],
  );

  const toggleItem = useCallback((id: string, checked: boolean): void => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, checked } : item)));
  }, []);

  const removeItem = useCallback((id: string): void => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

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

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <KewekeHeader listId={listId} />
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="invoice-rule flex flex-wrap items-end justify-between gap-4 border-b px-4 py-5 sm:px-6 lg:px-8">
          <h1 className="text-xl leading-none font-semibold tracking-tight uppercase sm:text-2xl">
            Weekend groceries
          </h1>
          <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            {String(activeCount).padStart(2, "0")} open · {String(completedCount).padStart(2, "0")}{" "}
            done
          </p>
        </div>

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
  items: ShoppingItem[];
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
