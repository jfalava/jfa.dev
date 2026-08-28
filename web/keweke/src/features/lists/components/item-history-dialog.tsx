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
import { History, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { toast } from "sonner";

import {
  buildHistoryTableRows,
  formatRelativeTime,
  type HistoryTableRow,
} from "@/features/lists/lib/item-history";
import { getItemHistory } from "@/features/lists/lib/list-repository";

const PAGE_SIZE = 50;
const historyTableFeatures = tableFeatures({});
const historyColumnHelper = createColumnHelper<typeof historyTableFeatures, HistoryTableRow>();

const historyColumns = historyColumnHelper.columns([
  historyColumnHelper.display({
    id: "field",
    header: "field",
    cell: ({ row }) => (
      <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
        {row.original.field}
      </span>
    ),
  }),
  historyColumnHelper.display({
    id: "before",
    header: "changed",
    cell: ({ row }) => <HistoryValue tone="old" value={row.original.before} />,
  }),
  historyColumnHelper.display({
    id: "after",
    header: "new value",
    cell: ({ row }) => <HistoryValue tone="new" value={row.original.after} />,
  }),
  historyColumnHelper.display({
    id: "details",
    header: "updated",
    cell: ({ row }) => {
      const appliedAt = new Date(row.original.appliedAt);
      const absoluteTime = Number.isNaN(appliedAt.getTime())
        ? row.original.appliedAt
        : appliedAt.toLocaleString();

      return (
        <div className="min-w-28" title={absoluteTime}>
          <p className="truncate font-serif text-xs font-medium">{row.original.actorName}</p>
          <p className="mt-0.5 font-mono text-[10px] tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase">
            {formatRelativeTime(row.original.appliedAt)} · rev {row.original.revision}
          </p>
        </div>
      );
    },
  }),
]);

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
          toast.error("History is unavailable right now.");
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
      toast.error("Could not load older events.");
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
          aria-label={`History for ${itemName}`}
          className="flex max-h-[85vh] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.12em] text-primary uppercase">
                item history
              </p>
              <h2 className="mt-1 truncate font-serif text-base font-semibold tracking-tight">
                {itemName}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-destructive" />
                  changed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                  new value
                </span>
              </div>
            </div>
            <Button
              aria-label="Close history"
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
              <p className="px-5 py-10 text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                loading history…
              </p>
            ) : events.length === 0 ? (
              <p className="px-5 py-10 text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                no recorded changes yet
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
                  {isLoading ? "Loading" : "Load older changes"}
                </Button>
              ) : (
                <p className="text-center font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  beginning of recorded history
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
  const table = useTable({
    features: historyTableFeatures,
    data: rows,
    columns: historyColumns,
    getRowId: (row) => row.id,
  });

  return (
    <Table className="min-w-[640px] text-xs">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="hover:bg-transparent" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                className="h-9 bg-popover px-3 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase"
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
          ? "inline-flex max-w-52 items-center gap-1 rounded-sm bg-success/10 px-2 py-1 font-mono text-[11px] text-success"
          : "inline-flex max-w-52 items-center gap-1 rounded-sm bg-destructive/10 px-2 py-1 font-mono text-[11px] text-destructive"
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
