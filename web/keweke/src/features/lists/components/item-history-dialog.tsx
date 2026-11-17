import type { ListItemHistoryEvent } from "@jfa.dev/common/lists";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@jfa.dev/common/ui";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { fbs } from "fbtee";
import { History, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { toast } from "sonner";

import { getLocale } from "@/app/i18n/runtime";
import {
  buildHistoryTableRows,
  formatRelativeTime,
  type HistoryField,
  type HistoryStatus,
  type HistoryTableRow,
} from "@/features/lists/lib/item-history";
import { getItemHistory } from "@/features/lists/lib/list-repository";

const PAGE_SIZE = 50;
const historyTableFeatures = tableFeatures({});
const historyColumnHelper = createColumnHelper<typeof historyTableFeatures, HistoryTableRow>();

function historyFieldLabel(field: HistoryField): string {
  const labels = {
    name: fbs("name", "Item history table: row for a change to the item name"),
    qty: fbs("qty", "Item history table: row for a change to the item quantity"),
    unit: fbs("unit", "Item history table: row for a change to the item unit (box, bag, kg)"),
    each: fbs("each", "Item history table: row for a change to what one unit of the item contains"),
    category: fbs("category", "Item history table: row for a change to the item category"),
    item: fbs("item", "Item history table: row for the item being added or updated"),
    status: fbs(
      "status",
      "Item history table: row for a change to the item status (open, done, removed)",
    ),
  } satisfies Record<HistoryField, string>;
  return labels[field];
}

function historyStatusLabel(status: HistoryStatus): string {
  const labels = {
    open: fbs("open", "Item history table: status of an item still to buy on the list"),
    done: fbs("done", "Item history table: status of an item checked off into inventory"),
    active: fbs("active", "Item history table: status of an item that is not removed"),
    removed: fbs("removed", "Item history table: status of an item moved to deleted items"),
    deleted: fbs("deleted", "Item history table: status of an item deleted forever"),
    updated: fbs("updated", "Item history table: new value when an edit changed no tracked field"),
  } satisfies Record<HistoryStatus, string>;
  return labels[status];
}

function historyValueLabel(row: HistoryTableRow, value: string): string {
  // SAFETY: buildHistoryTableRows only puts HistoryStatus codes or "—" in
  // status-kind rows.
  return row.valueKind === "status" && value !== "—"
    ? historyStatusLabel(value as HistoryStatus)
    : value;
}

function createHistoryColumns() {
  const locale = getLocale();
  const justNow = fbs("just now", "Item history table: time of a change made seconds ago");

  return historyColumnHelper.columns([
    historyColumnHelper.display({
      id: "field",
      header: fbs("field", "Item history table column header: which field changed"),
      cell: ({ row }) => (
        <span className="type-label text-muted-foreground">
          {historyFieldLabel(row.original.field)}
        </span>
      ),
    }),
    historyColumnHelper.display({
      id: "before",
      header: fbs("changed", "Item history table column header: the value before the change"),
      cell: ({ row }) => (
        <HistoryValue tone="old" value={historyValueLabel(row.original, row.original.before)} />
      ),
    }),
    historyColumnHelper.display({
      id: "after",
      header: fbs("new value", "Item history table column header: the value after the change"),
      cell: ({ row }) => (
        <HistoryValue tone="new" value={historyValueLabel(row.original, row.original.after)} />
      ),
    }),
    historyColumnHelper.display({
      id: "details",
      header: fbs("updated", "Item history table column header: who made the change and when"),
      cell: ({ row }) => {
        const appliedAt = new Date(row.original.appliedAt);
        const absoluteTime = Number.isNaN(appliedAt.getTime())
          ? row.original.appliedAt
          : appliedAt.toLocaleString(locale);

        return (
          <div className="min-w-28" title={absoluteTime}>
            <p className="truncate font-serif text-xs font-medium">
              {row.original.actorName ??
                fbs("someone", "Item history table: author of a change with no recorded user")}
            </p>
            <p className="mt-0.5 type-label whitespace-nowrap text-muted-foreground">
              <fbt desc="Item history table: when a change happened and its revision number, such as '5 minutes ago · rev 12'">
                <fbt:param name="relativeTime">
                  {formatRelativeTime(row.original.appliedAt, { justNow, locale })}
                </fbt:param>{" "}
                · rev <fbt:param name="revision">{row.original.revision}</fbt:param>
              </fbt>
            </p>
          </div>
        );
      },
    }),
  ]);
}

interface ItemHistoryDialogProps {
  isOpen: boolean;
  itemId: string;
  itemName: string;
  listId: string;
  onOpenChange: (isOpen: boolean) => void;
}

export function ItemHistoryDialog({
  isOpen,
  itemId,
  itemName,
  listId,
  onOpenChange,
}: ItemHistoryDialogProps) {
  const [events, setEvents] = useState<readonly ListItemHistoryEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let cancelled = false;
    void getItemHistory(listId, itemId, { limit: PAGE_SIZE })
      .then((page) => {
        if (!cancelled) {
          setEvents(page.events);
          setNextCursor(page.nextCursor);
        }
        return page;
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(
            fbs(
              "History is unavailable right now.",
              "Toast shown when an item's change history fails to load",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, itemId, listId]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (isLoading || nextCursor === null) {
      return undefined;
    }

    setIsLoading(true);
    try {
      const page = await getItemHistory(listId, itemId, {
        beforeRevision: nextCursor,
        limit: PAGE_SIZE,
      });
      setEvents((current) => {
        const seenMutationIds = new Set(current.map((event) => event.mutationId));
        return [
          ...current,
          ...page.events.filter((event) => !seenMutationIds.has(event.mutationId)),
        ];
      });
      setNextCursor(page.nextCursor);
    } catch {
      toast.error(
        fbs(
          "Could not load older events.",
          "Toast shown when loading older entries of an item's change history fails",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, itemId, listId, nextCursor]);

  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      isDismissable
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal className="w-full max-w-3xl outline-none">
        <Dialog
          aria-label={fbs(
            `History for ${fbs.param("itemName", itemName)}`,
            "Accessible label of the dialog showing an item's change history",
          )}
          className="flex max-h-[85vh] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-base font-semibold tracking-tight">
                {itemName}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-destructive" />
                  <fbt desc="Legend in the item history dialog for the red marker on old values">
                    Changed
                  </fbt>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                  <fbt desc="Legend in the item history dialog for the green marker on new values">
                    New value
                  </fbt>
                </span>
              </div>
            </div>
            <Button
              aria-label={fbs(
                "Close history",
                "Accessible label of the button that closes the item history dialog",
              )}
              className="size-7 shrink-0 px-0"
              onPress={() => onOpenChange(false)}
              size="icon-sm"
              variant="ghost"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {isLoading && events.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                <fbt desc="Shown while an item's change history is loading">Loading history…</fbt>
              </p>
            ) : events.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                <fbt desc="Shown in the item history dialog when the item has no recorded changes">
                  No recorded changes yet.
                </fbt>
              </p>
            ) : (
              <HistoryTable events={events} />
            )}
          </div>

          {events.length > 0 ? (
            <div className="border-t border-border px-5 py-3">
              {nextCursor !== null ? (
                <Button
                  className="w-full"
                  isDisabled={isLoading}
                  onPress={() => void loadMore()}
                  size="sm"
                  variant="outline"
                >
                  <History aria-hidden="true" className="size-3.5" />
                  {isLoading ? (
                    <fbt desc="Button label in the item history dialog while older changes load">
                      Loading
                    </fbt>
                  ) : (
                    <fbt desc="Button in the item history dialog that loads older changes">
                      Load older changes
                    </fbt>
                  )}
                </Button>
              ) : (
                <p className="text-center type-label text-muted-foreground">
                  <fbt desc="Shown at the end of the item history dialog when there are no older changes">
                    beginning of recorded history
                  </fbt>
                </p>
              )}
            </div>
          ) : null}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function HistoryTable({ events }: { events: readonly ListItemHistoryEvent[] }) {
  const rows = useMemo(() => buildHistoryTableRows(events), [events]);
  const columns = useMemo(() => createHistoryColumns(), []);
  const table = useTable({
    features: historyTableFeatures,
    data: rows,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <Table className="min-w-160 text-xs">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="hover:bg-transparent" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                className="h-9 bg-popover px-3 type-label text-muted-foreground"
                key={header.id}
              >
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow className="hover:bg-muted/30" key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell className="px-3 py-3" key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function HistoryValue({ tone, value }: { tone: "new" | "old"; value: string }) {
  const isNewValue = tone === "new";
  return (
    <span
      className={
        isNewValue
          ? "inline-flex max-w-52 items-center gap-1 rounded-sm bg-success/10 px-2 py-1 font-mono text-xs text-success"
          : "inline-flex max-w-52 items-center gap-1 rounded-sm bg-destructive/10 px-2 py-1 font-mono text-xs text-destructive"
      }
    >
      {isNewValue ? (
        <Plus aria-hidden="true" className="size-3 shrink-0" />
      ) : (
        <Minus aria-hidden="true" className="size-3 shrink-0" />
      )}
      <span className={isNewValue ? "truncate" : "truncate line-through"}>{value}</span>
    </span>
  );
}
