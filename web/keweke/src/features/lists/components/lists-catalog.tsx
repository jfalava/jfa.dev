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
import { Link } from "@tanstack/react-router";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { fbs } from "fbtee";
import { ChevronRight, Cloud, House, List, ListChecks, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { HotkeyKbd } from "@/app/components/hotkey-kbd";

const listsTableFeatures = tableFeatures({});

/**
 * Aligns the table's outer columns with the page gutter used by
 * `ListsPageHeader` and every other section (`px-4 sm:px-6 lg:px-8`).
 */
function columnGutterClass(index: number, columnCount: number): string | undefined {
  if (index === 0) {
    return "pl-4 sm:pl-6 lg:pl-8";
  }
  if (index === columnCount - 1) {
    return "pr-4 sm:pr-6 lg:pr-8";
  }
  return undefined;
}
const listsColumnHelper = createColumnHelper<typeof listsTableFeatures, ListSummary>();

export type ListsCatalogProps = {
  confirmingListId?: string;
  deletingListId?: string;
  lists: ListSummary[];
  onCancelDelete: () => void;
  onConfirmDelete: (listId: string) => void;
  onRemove: (list: ListSummary) => void;
};

function createListsColumns({
  confirmingListId,
  deletingListId,
  onCancelDelete,
  onConfirmDelete,
  onRemove,
}: Omit<ListsCatalogProps, "lists">) {
  return listsColumnHelper.columns([
    listsColumnHelper.display({
      id: "order",
      header: "#",
      cell: ({ row }) => {
        const index = row.index;
        if (index >= 9) {
          return (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {index + 1}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <HotkeyKbd hotkey={`Mod+Shift+${index + 1}`} />
          </span>
        );
      },
    }),
    listsColumnHelper.display({
      id: "list",
      header: fbs("List", "Column header for list titles in the saved lists table"),
      cell: ({ row }) => {
        const list = row.original;
        return (
          <Link
            className="group block min-w-0 no-underline"
            params={{ listId: list.alias ?? list.id }}
            to="/$listId"
          >
            <p className="truncate font-serif text-lg font-semibold tracking-tight group-hover:text-primary">
              {list.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {list.backend === "local" ? (
                <fbt desc="Label in the saved lists table for a list stored only in this browser">
                  Local
                </fbt>
              ) : (
                <fbt desc="Label in the saved lists table for a list stored on the server">
                  Remote
                </fbt>
              )}
              {list.alias ? ` · ${list.alias}` : ""}
            </p>
          </Link>
        );
      },
    }),
    listsColumnHelper.display({
      id: "progress",
      header: fbs("Progress", "Column header for item and done counts in the saved lists table"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          <fbt desc="Progress of a list in the saved lists table: how many items it has and how many are done">
            <fbt:plural
              count={row.original.itemCount}
              many="items"
              name="itemCount"
              showCount="yes"
            >
              item
            </fbt:plural>{" "}
            ·{" "}
            <fbt:plural
              count={row.original.completedCount}
              many="done"
              name="completedCount"
              showCount="yes"
            >
              done
            </fbt:plural>
          </fbt>
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
                  <span className="text-xs text-destructive">
                    {isForgetOnly ? (
                      <fbt desc="Prompt asking to confirm removing a shared list from this device only">
                        Forget?
                      </fbt>
                    ) : (
                      <fbt desc="Prompt asking to confirm deleting a list">Delete?</fbt>
                    )}
                  </span>
                  <Button
                    aria-label={
                      isForgetOnly
                        ? fbs(
                            `Confirm forget ${fbs.param("listTitle", list.title)}`,
                            "Accessible label of the button that confirms removing a shared list from this device",
                          )
                        : fbs(
                            `Confirm delete ${fbs.param("listTitle", list.title)}`,
                            "Accessible label of the button that confirms deleting a list",
                          )
                    }
                    isDisabled={deletingListId === list.id}
                    onPress={() => onRemove(list)}
                    size="sm"
                    variant="destructive"
                  >
                    <fbt desc="Button that confirms deleting or forgetting a list">Yes</fbt>
                  </Button>
                  <Button
                    aria-label={fbs(
                      `Keep ${fbs.param("listTitle", list.title)}`,
                      "Accessible label of the button that cancels deleting or forgetting a list",
                    )}
                    isDisabled={deletingListId === list.id}
                    onPress={onCancelDelete}
                    size="sm"
                    variant="ghost"
                  >
                    <fbt desc="Button that cancels deleting or forgetting a list">Keep</fbt>
                  </Button>
                </>
              ) : (
                <Button
                  aria-label={
                    isForgetOnly
                      ? fbs(
                          `Forget ${fbs.param("listTitle", list.title)}`,
                          "Accessible label of the button that starts removing a shared list from this device",
                        )
                      : fbs(
                          `Delete ${fbs.param("listTitle", list.title)}`,
                          "Accessible label of the button that starts deleting a list",
                        )
                  }
                  onPress={() => onConfirmDelete(list.id)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="size-3.5" />
                  <span className="hidden sm:inline">
                    {isForgetOnly ? (
                      <fbt desc="Button that starts removing a shared list from this device">
                        Forget
                      </fbt>
                    ) : (
                      <fbt desc="Button that starts deleting a list">Delete</fbt>
                    )}
                  </span>
                </Button>
              )
            ) : null}
            <Link
              aria-label={fbs(
                `Open ${fbs.param("listTitle", list.title)}`,
                "Accessible label of the link that opens a list from the saved lists table",
              )}
              className="font-mono text-xs tracking-[0.08em] text-muted-foreground transition-colors hover:text-primary"
              params={{ listId: list.alias ?? list.id }}
              to="/$listId"
            >
              <fbt desc="Link that opens a list from the saved lists table">Open →</fbt>
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
}: ListsCatalogProps) {
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
            {headerGroup.headers.map((header, index) => (
              <TableHead
                className={columnGutterClass(index, headerGroup.headers.length)}
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
          <TableRow key={row.id}>
            {row.getAllCells().map((cell, index, cells) => (
              <TableCell className={columnGutterClass(index, cells.length)} key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MobileListsList({
  confirmingListId,
  deletingListId,
  lists,
  onCancelDelete,
  onConfirmDelete,
  onRemove,
}: ListsCatalogProps) {
  return (
    <ul className="divide-y divide-border md:hidden">
      {lists.map((list, index) => {
        const isForgetOnly = list.backend === "remote" && list.remoteRole !== "owner";
        const isConfirming = confirmingListId === list.id;
        const isDeleting = deletingListId === list.id;
        const BackendIcon = list.backend === "remote" ? Cloud : House;
        return (
          <li key={list.id}>
            <div className="flex items-center gap-2 px-4 py-3 sm:px-6">
              <Link
                className="group flex min-w-0 flex-1 items-center gap-3 no-underline"
                params={{ listId: list.alias ?? list.id }}
                to="/$listId"
              >
                <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground tabular-nums sm:inline-flex">
                  <span>{index + 1}</span>
                  {index < 9 ? <HotkeyKbd hotkey={`Mod+Shift+${index + 1}`} /> : null}
                </span>
                <BackendIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-base font-semibold tracking-tight group-hover:text-primary">
                    {list.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-x-3 text-xs text-muted-foreground tabular-nums">
                    <span
                      aria-label={fbs(
                        [
                          fbs.plural("item", list.itemCount, {
                            many: "items",
                            name: "itemCount",
                            showCount: "yes",
                          }),
                        ],
                        "Accessible label for the number of items in a list on the mobile saved lists view",
                      )}
                      className="inline-flex items-center gap-1"
                    >
                      <List aria-hidden="true" className="size-3.5" />
                      {list.itemCount}
                    </span>
                    <span
                      aria-label={fbs(
                        [
                          fbs.plural("done", list.completedCount, {
                            many: "done",
                            name: "completedCount",
                            showCount: "yes",
                          }),
                        ],
                        "Accessible label for the number of done items in a list on the mobile saved lists view",
                      )}
                      className="inline-flex items-center gap-1"
                    >
                      <ListChecks aria-hidden="true" className="size-3.5" />
                      {list.completedCount}
                    </span>
                  </p>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </Link>
              {isConfirming ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-xs text-destructive">
                    {isForgetOnly ? (
                      <fbt desc="Prompt asking to confirm removing a shared list from this device only">
                        Forget?
                      </fbt>
                    ) : (
                      <fbt desc="Prompt asking to confirm deleting a list">Delete?</fbt>
                    )}
                  </span>
                  <Button
                    aria-label={
                      isForgetOnly
                        ? fbs(
                            `Confirm forget ${fbs.param("listTitle", list.title)}`,
                            "Accessible label of the button that confirms removing a shared list from this device",
                          )
                        : fbs(
                            `Confirm delete ${fbs.param("listTitle", list.title)}`,
                            "Accessible label of the button that confirms deleting a list",
                          )
                    }
                    isDisabled={isDeleting}
                    onPress={() => onRemove(list)}
                    size="sm"
                    variant="destructive"
                  >
                    <fbt desc="Button that confirms deleting or forgetting a list">Yes</fbt>
                  </Button>
                  <Button
                    aria-label={fbs(
                      `Keep ${fbs.param("listTitle", list.title)}`,
                      "Accessible label of the button that cancels deleting or forgetting a list",
                    )}
                    isDisabled={isDeleting}
                    onPress={onCancelDelete}
                    size="sm"
                    variant="ghost"
                  >
                    <fbt desc="Button that cancels deleting or forgetting a list">Keep</fbt>
                  </Button>
                </div>
              ) : (
                <Button
                  aria-label={
                    isForgetOnly
                      ? fbs(
                          `Forget ${fbs.param("listTitle", list.title)}`,
                          "Accessible label of the button that starts removing a shared list from this device",
                        )
                      : fbs(
                          `Delete ${fbs.param("listTitle", list.title)}`,
                          "Accessible label of the button that starts deleting a list",
                        )
                  }
                  onPress={() => onConfirmDelete(list.id)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ListsCatalog(props: ListsCatalogProps) {
  return (
    <>
      <div className="hidden w-full overflow-x-auto md:block">
        <ListsTable {...props} />
      </div>
      <MobileListsList {...props} />
    </>
  );
}
