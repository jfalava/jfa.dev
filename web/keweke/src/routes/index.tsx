import type { ListSummary } from "@jfa.dev/common/lists";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@jfa.dev/common/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { KewekeHeader } from "@/components/keweke-header";
import { removeRemoteList } from "@/lib/list-repository";
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

/* -------------------------------------------------------------------------
 * Lists table
 * ---------------------------------------------------------------------- */

const listsTableFeatures = tableFeatures({});
const listsColumnHelper = createColumnHelper<typeof listsTableFeatures, ListSummary>();

function createListsColumns({
  confirmingListId,
  deletingListId,
  onCancelDelete,
  onConfirmDelete,
  onRemove,
}: {
  confirmingListId?: string;
  deletingListId?: string;
  onCancelDelete: () => void;
  onConfirmDelete: (listId: string) => void;
  onRemove: (list: ListSummary) => void;
}) {
  return listsColumnHelper.columns([
    listsColumnHelper.display({
      id: "list",
      header: "List",
      cell: ({ row }) => {
        const list = row.original;
        return (
          <Link
            className="group block min-w-0"
            params={{ listId: list.alias ?? list.id }}
            to="/$listId"
          >
            <p className="truncate font-serif text-lg font-semibold tracking-tight group-hover:text-primary">
              {list.title}
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
              {list.backend}
              {list.alias ? ` · ${list.alias}` : ""}
            </p>
          </Link>
        );
      },
    }),
    listsColumnHelper.display({
      id: "progress",
      header: "Progress",
      cell: ({ row }) => (
        <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          {row.original.itemCount} lines · {row.original.completedCount} done
        </span>
      ),
    }),
    listsColumnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const list = row.original;
        const isForgetOnly = list.backend === "remote" && list.remoteRole !== "owner";
        return (
          <div className="flex shrink-0 items-center justify-end gap-1.5">
            {list.backend === "local" || list.backend === "remote" ? (
              confirmingListId === list.id ? (
                <>
                  <span className="font-mono text-[10px] tracking-[0.08em] text-destructive">
                    {isForgetOnly ? "Forget?" : "Delete?"}
                  </span>
                  <Button
                    aria-label={`${isForgetOnly ? "Confirm forget" : "Confirm delete"} ${list.title}`}
                    isDisabled={deletingListId === list.id}
                    onPress={() => onRemove(list)}
                    size="sm"
                    variant="destructive"
                  >
                    Yes
                  </Button>
                  <Button
                    aria-label={`Keep ${list.title}`}
                    isDisabled={deletingListId === list.id}
                    onPress={onCancelDelete}
                    size="sm"
                    variant="ghost"
                  >
                    Keep
                  </Button>
                </>
              ) : (
                <Button
                  aria-label={`${isForgetOnly ? "Forget" : "Delete"} ${list.title}`}
                  onPress={() => onConfirmDelete(list.id)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="size-3.5" />
                  <span className="hidden sm:inline">{isForgetOnly ? "Forget" : "Delete"}</span>
                </Button>
              )
            ) : null}
            <Link
              aria-label={`Open ${list.title}`}
              className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground transition-colors hover:text-primary"
              params={{ listId: list.alias ?? list.id }}
              to="/$listId"
            >
              Open →
            </Link>
          </div>
        );
      },
    }),
  ]);
}

function ListsTable({
  confirmingListId,
  deletingListId,
  lists,
  onCancelDelete,
  onConfirmDelete,
  onRemove,
}: {
  confirmingListId?: string;
  deletingListId?: string;
  lists: ListSummary[];
  onCancelDelete: () => void;
  onConfirmDelete: (listId: string) => void;
  onRemove: (list: ListSummary) => void;
}) {
  const columns = useMemo(
    () =>
      createListsColumns({
        confirmingListId,
        deletingListId,
        onCancelDelete,
        onConfirmDelete,
        onRemove,
      }),
    [confirmingListId, deletingListId, onCancelDelete, onConfirmDelete, onRemove],
  );
  const table = useTable({
    features: listsTableFeatures,
    data: lists,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="hover:bg-transparent" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

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
    setDeletingListId(list.id);
    try {
      if (list.backend === "local") {
        await deleteLocalList(list.id);
      } else {
        await removeRemoteList(list.id);
      }
      setConfirmingListId(undefined);
      setError(undefined);
    } catch {
      setError(
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <KewekeHeader hideMobileNewListButton={!isLoading && lists.length === 0} />
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="invoice-rule flex flex-wrap items-end justify-between gap-4 border-b px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
              local collection
            </p>
            <h1 className="mt-2 text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl">
              Your lists
            </h1>
          </div>
          <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            {lists.length} saved
          </p>
        </div>

        {isLoading ? (
          <p className="px-4 py-10 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase sm:px-6 lg:px-8">
            reading local storage…
          </p>
        ) : lists.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <ListsTable
              confirmingListId={confirmingListId}
              deletingListId={deletingListId}
              lists={lists}
              onCancelDelete={cancelDelete}
              onConfirmDelete={confirmDelete}
              onRemove={onRemove}
            />
          </div>
        ) : (
          <div className="px-4 py-10 sm:px-6 lg:px-8">
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
          <p className="border-t border-destructive/40 px-4 py-3 font-mono text-[10px] tracking-wide text-destructive uppercase sm:px-6 lg:px-8">
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}
